import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { CROP_IDS } from "@/types/contracts";
import type { CropLevel, CropOption } from "@/types/crops";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if (character === "\n" && !quoted) {
      row.push(field.replace(/\r$/, ""));
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  return rows;
}

function parseLevel(value: string): CropLevel {
  if (value === "low" || value === "medium" || value === "high") return value;
  throw new Error(`Unknown crop rating: ${value}`);
}

function parseBoolean(value: string): boolean {
  if (value === "true" || value === "yes") return true;
  if (value === "false" || value === "no") return false;
  throw new Error(`Invalid crop catalog boolean: ${value}`);
}

function loadCropOptions(csv: string): CropOption[] {
  const [header, ...rows] = parseCsv(csv);
  if (!header || rows.length === 0) throw new Error("The crop catalog is empty.");
  const columns = new Map(header.map((name, index) => [name, index]));

  function value(row: string[], column: string): string {
    const index = columns.get(column);
    if (index === undefined || row[index] === undefined) {
      throw new Error(`Crop catalog is missing the ${column} column.`);
    }
    return row[index];
  }

  return rows.map((row) => {
    const cropId = value(row, "crop_id");
    if (!CROP_IDS.includes(cropId as (typeof CROP_IDS)[number])) {
      throw new Error(`Unsupported crop ID in catalog: ${cropId}`);
    }

    const waterMin = Number(value(row, "water_mm_season_min"));
    const waterMax = Number(value(row, "water_mm_season_max"));
    if (!Number.isFinite(waterMin) || !Number.isFinite(waterMax)) {
      throw new Error(`Invalid water-use range for crop: ${cropId}`);
    }

    return {
      crop_id: cropId as CropOption["crop_id"],
      family: value(row, "family"),
      drought_tolerance: parseLevel(value(row, "drought_tolerance")),
      water_mm_season_min: waterMin,
      water_mm_season_max: waterMax,
      fixes_nitrogen: parseBoolean(value(row, "fixes_nitrogen")),
      erosion_protection: parseLevel(value(row, "erosion_protection")),
      is_cover_crop: parseBoolean(value(row, "is_cover_crop")),
      planting_window_tx: value(row, "planting_window_tx"),
      verified: parseBoolean(value(row, "verified")),
    };
  });
}

export async function GET() {
  const candidatePaths = [
    path.resolve(process.cwd(), "src/data/crops.csv"),
    path.resolve(process.cwd(), "../data/crops.csv"),
    path.resolve(process.cwd(), "data/crops.csv"),
  ];

  let csv: string | null = null;
  for (const candidate of candidatePaths) {
    try {
      csv = await readFile(candidate, "utf8");
      break;
    } catch {
      // try next candidate path
    }
  }

  if (csv) {
    try {
      return NextResponse.json(loadCropOptions(csv), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (parseError) {
      console.error("Error parsing crops CSV:", parseError);
    }
  }

  return NextResponse.json(
    { error: "The crop catalog could not be loaded. Check that crops.csv is available." },
    { status: 500 },
  );
}
