import { NextResponse } from "next/server";
import demoResponse from "../../../../../data/mocks/recommend_farm_1.json";
import farmsData from "../../../../../data/farms.json";
import {
  CROP_IDS,
  PRIORITIES,
  PRIORITY_WEIGHTS,
  type Priority,
  type RecommendRequest,
  type RecommendResponse,
} from "@/types/contracts";

const farmIds = new Set(farmsData.farms.map((farm) => farm.farm_id));

type RequestValidation =
  | { request: RecommendRequest }
  | { error: string; status: number };

function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && PRIORITIES.includes(value as Priority);
}

function validateRequest(value: unknown): RequestValidation {
  if (!value || typeof value !== "object") {
    return { error: "Send a valid recommendation request.", status: 400 };
  }

  const body = value as Record<string, unknown>;
  if (!isPriority(body.priority)) {
    return { error: "Choose a valid farming goal.", status: 400 };
  }
  const currentCrops = body.current_crops ?? [];
  if (
    !Array.isArray(currentCrops) ||
    !currentCrops.every(
      (crop) => typeof crop === "string" && CROP_IDS.includes(crop as (typeof CROP_IDS)[number]),
    )
  ) {
    return { error: "Choose crops from the farm crop catalog.", status: 400 };
  }

  if (typeof body.farm_id === "string" && body.farm_id.length > 0) {
    if (!farmIds.has(body.farm_id)) {
      return { error: "We couldn't find that sample farm.", status: 404 };
    }
    return {
      request: {
        farm_id: body.farm_id,
        priority: body.priority,
        current_crops: currentCrops,
      },
    };
  }

  if (
    typeof body.lat === "number" &&
    Number.isFinite(body.lat) &&
    body.lat >= -90 &&
    body.lat <= 90 &&
    typeof body.lon === "number" &&
    Number.isFinite(body.lon) &&
    body.lon >= -180 &&
    body.lon <= 180
  ) {
    return {
      request: {
        lat: body.lat,
        lon: body.lon,
        priority: body.priority,
        current_crops: currentCrops,
      },
    };
  }

  return {
    error: "Send a sample farm ID or a valid latitude and longitude.",
    status: 400,
  };
}

function savedDemo(request: RecommendRequest, reason: string) {
  const response = structuredClone(demoResponse) as RecommendResponse;
  const priority = request.priority;
  const weights = PRIORITY_WEIGHTS[priority];

  response.farm_id = request.farm_id ?? "custom";
  response.priority = priority;
  response.agent_report = null;
  const currentRotation = response.rotations.find((rotation) => rotation.is_current);
  if (currentRotation) {
    currentRotation.sequence = request.current_crops ?? [];
    currentRotation.label = currentRotation.sequence.length
      ? "Your current crops"
      : "No crops planted yet";
    currentRotation.scores = { climate: 0, soil: 0, market: 0, total: 0 };
    currentRotation.why = currentRotation.sequence.length
      ? "Your selected crops are shown as the current baseline; this saved sample does not score them."
      : "No current crops were selected, so this is an empty baseline.";
    currentRotation.gaps = [
      ...currentRotation.gaps,
      "The current-crop baseline is not scored by the saved sample data.",
    ];
  }
  response.rotations = response.rotations.map((rotation) => {
    if (rotation.is_current && rotation.sequence.length === 0) return rotation;
    const { climate, soil, market } = rotation.scores;
    const weightedScore =
      climate * weights.climate + soil * weights.soil + market * weights.market;
    const total = Number(weightedScore.toFixed(1));
    return { ...rotation, scores: { ...rotation.scores, total } };
  }) as RecommendResponse["rotations"];
  response.best_rotation_id = response.rotations
    .filter((rotation) => !rotation.is_current)
    .reduce((best, rotation) =>
    rotation.scores.total > best.scores.total ? rotation : best,
  ).id;
  response.data_notes = [
    ...response.data_notes,
    reason,
    "Live climate, soil, satellite, and local market data are not connected for the selected location. These saved examples are from Lubbock.",
  ];

  return response;
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ detail: "Send a valid JSON request." }, { status: 400 });
  }

  const validation = validateRequest(input);
  if ("error" in validation) {
    return NextResponse.json({ detail: validation.error }, { status: validation.status });
  }
  const validatedRequest = validation.request;

  const backendUrl = (
    process.env.FARMFUTURE_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  try {
    const upstream = await fetch(`${backendUrl}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedRequest),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const body = await upstream.json().catch(() => ({}));
      if (upstream.status === 503 && validatedRequest.lat !== undefined) {
        const detail =
          typeof body === "object" && body && "detail" in body && typeof body.detail === "string"
            ? body.detail
            : "Location-based climate data is temporarily unavailable.";
        return NextResponse.json(
          savedDemo(
            validatedRequest,
            `${detail} Saved Lubbock demo results are shown instead; they do not use the marked coordinates.`,
          ),
          { headers: { "x-farmfuture-data-source": "saved-demo" } },
        );
      }
      return NextResponse.json(body, { status: upstream.status });
    }

    const recommendation = (await upstream.json()) as RecommendResponse;
    return NextResponse.json(recommendation, {
      headers: { "x-farmfuture-data-source": "backend" },
    });
  } catch (error) {
    if (!(error instanceof TypeError)) {
      return NextResponse.json(
        { detail: "The recommendation service returned an unexpected response." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      savedDemo(
        validatedRequest,
        "The recommendation API is unavailable. Saved Lubbock example results are shown instead.",
      ),
      {
      headers: { "x-farmfuture-data-source": "saved-demo" },
      },
    );
  }
}
