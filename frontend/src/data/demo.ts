import type { Priority, RecommendResponse, RotationResult } from "@/types/contracts";

const WEIGHTS: Record<Priority, RotationResult["scores"]> = {
  Profit: { climate: 0.25, soil: 0.15, market: 0.6, total: 0 },
  "Water Saving": { climate: 0.55, soil: 0.3, market: 0.15, total: 0 },
  "Soil Health": { climate: 0.2, soil: 0.6, market: 0.2, total: 0 },
  Balanced: { climate: 0.35, soil: 0.35, market: 0.3, total: 0 },
};

const SAMPLE_ROTATIONS: RotationResult[] = [
  {
    id: "current",
    label: "Current rotation",
    sequence: ["cotton", "cotton", "cotton"],
    is_current: true,
    scores: { climate: 62, soil: 48, market: 80, total: 0 },
    why: "This example repeats cotton for three seasons. A more varied plan may help reduce pressure on water and soil.",
    evidence: ["Illustrative climate, soil, and market scores"],
    benefits: ["Keeps a familiar crop in the plan"],
    gaps: ["Local irrigation access and production costs are not included"],
    risks: ["Repeated crops may increase pest and soil-health challenges"],
  },
  {
    id: "rot_01",
    label: "Water-smart rotation",
    sequence: ["sorghum", "soybean", "oats_cover"],
    is_current: false,
    scores: { climate: 88, soil: 83, market: 68, total: 0 },
    why: "This example pairs drought-tolerant sorghum with a legume and a soil-cover crop.",
    evidence: ["Illustrative climate, soil, and market scores"],
    benefits: ["Prioritizes drought tolerance", "Includes a legume and a cover crop"],
    gaps: ["Planting dates and local varieties need to be checked"],
    risks: ["May require different equipment or crop-management experience"],
  },
  {
    id: "rot_02",
    label: "Market-focused rotation",
    sequence: ["wheat", "peanut", "forage_grass"],
    is_current: false,
    scores: { climate: 76, soil: 70, market: 94, total: 0 },
    why: "This example gives more weight to market potential while including a legume and forage.",
    evidence: ["Illustrative climate, soil, and market scores"],
    benefits: ["Strong example market score", "Adds crop variety to the plan"],
    gaps: ["Local prices, buyers, and production costs are not included"],
    risks: ["Market conditions can change before harvest"],
  },
];

export function getDemoRecommendation(farmId: string, priority: Priority): RecommendResponse {
  const weights = WEIGHTS[priority];
  const ranked = SAMPLE_ROTATIONS
    .map((rotation) => {
      const total =
        rotation.scores.climate * weights.climate +
        rotation.scores.soil * weights.soil +
        rotation.scores.market * weights.market;
      return { ...rotation, scores: { ...rotation.scores, total: Math.round(total * 10) / 10 } };
    })
    .sort((first, second) => second.scores.total - first.scores.total);

  return {
    farm_id: farmId,
    priority,
    best_rotation_id: ranked[0].id,
    rotations: [ranked[0], ranked[1], ranked[2]],
    data_notes: [
      "Demo preview: all scores and crop plans are illustrative, not farm-specific.",
      "This preview is not connected to live weather, soil, satellite, or market data.",
    ],
    disclaimer:
      "Use this preview to explore the app. It is not a planting, financial, or agronomic recommendation.",
  };
}
