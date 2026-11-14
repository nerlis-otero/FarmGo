import type { Priority } from "@/types/recommendation";

// Crop IDs must match the IDs agreed on by the team.
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

// "Corn → Soybeans → Cover crop oats"
export function rotationName(crops: string[]): string {
  return crops.map((c) => CROP_NAMES[c] ?? c).join(" → ");
}

// "first corn, then soybeans, and then cover crop oats"
export function rotationSentence(crops: string[]): string {
  const names = crops.map((c) => (CROP_NAMES[c] ?? c).toLowerCase());
  const starts = ["first", "then", "and then"];
  return names.map((n, i) => `${starts[i] ?? "then"} ${n}`).join(", ");
}

export const PRIORITIES: { id: Priority; label: string; hint: string }[] = [
  { id: "water_saving", label: "Save water", hint: "Drought-tolerant crops" },
  { id: "profit", label: "Maximize profit", hint: "The highest-income option" },
  { id: "soil_health", label: "Improve soil health", hint: "Protect the soil" },
  { id: "balanced", label: "Balance priorities", hint: "Balance water, soil, and profit" },
];

export function priorityLabel(id: Priority): string {
  return PRIORITIES.find((p) => p.id === id)?.label ?? id;
}

export function confidenceLabel(value: number): string {
  if (value >= 0.75) return "high";
  if (value >= 0.5) return "medium";
  return "low";
}

// Show scores as words and colors instead of numbers alone.
export type Rating = "good" | "ok" | "low";

export function rating(score: number): Rating {
  if (score >= 75) return "good";
  if (score >= 55) return "ok";
  return "low";
}

export const RATING_WORDS: Record<Rating, string> = {
  good: "Good",
  ok: "Fair",
  low: "Weak",
};

export const OVERALL_WORDS: Record<Rating, string> = {
  good: "Best fit",
  ok: "Fair option",
  low: "Weak option",
};

export const RATING_DOT: Record<Rating, string> = {
  good: "bg-fern",
  ok: "bg-ok",
  low: "bg-low",
};
