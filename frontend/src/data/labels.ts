import type { CropId, Priority } from "@/types/recommendation";

export const CROP_NAMES: Record<string, string> = {
  corn: "Corn",
  cotton: "Cotton",
  sorghum: "Sorghum",
  soybean: "Soybeans",
  wheat: "Wheat",
  peanut: "Peanuts",
  oats_cover: "Cover crop oats",
  forage_grass: "Forage grass",
};

export function rotationName(crops: CropId[]): string {
  return crops.map((c) => CROP_NAMES[c] ?? c).join(" → ");
}

export const PRIORITIES: { id: Priority; label: string; hint: string }[] = [
  { id: "Water Saving", label: "Save water", hint: "Favor crops that handle dry conditions" },
  { id: "Profit", label: "Improve farm income", hint: "Give market potential more weight" },
  { id: "Soil Health", label: "Protect the soil", hint: "Favor soil health and ground cover" },
  { id: "Balanced", label: "Balance priorities", hint: "Consider water, soil, and market" },
];

export function priorityLabel(id: Priority): string {
  return PRIORITIES.find((p) => p.id === id)?.label ?? id;
}

export function parsePriority(value: string | null): Priority {
  const legacyValues: Record<string, Priority> = {
    profit: "Profit",
    water_saving: "Water Saving",
    soil_health: "Soil Health",
    balanced: "Balanced",
  };
  return PRIORITIES.find((item) => item.id === value)?.id ?? legacyValues[value ?? ""] ?? "Balanced";
}

// Show scores as words and colors instead of numbers alone.
export type Rating = "good" | "ok" | "low";

export function rating(score: number): Rating {
  if (score >= 75) return "good";
  if (score >= 55) return "ok";
  return "low";
}

export const RATING_WORDS: Record<Rating, string> = {
  good: "Strong",
  ok: "Fair",
  low: "Low",
};

export const OVERALL_WORDS: Record<Rating, string> = {
  good: "Strong fit",
  ok: "Fair fit",
  low: "Lower fit",
};

export const RATING_DOT: Record<Rating, string> = {
  good: "bg-fern",
  ok: "bg-ok",
  low: "bg-low",
};
