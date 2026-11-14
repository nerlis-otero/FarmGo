/**
 * FarmFuture AI: contratos de datos (espejo de backend/app/contracts.py).
 * Si cambias algo aquí, avisa al integrante 1 y actualiza también el backend y docs/contracts.md.
 */

export type CropId =
  | "corn" | "cotton" | "sorghum" | "soybean"
  | "wheat" | "peanut" | "oats_cover" | "forage_grass";

export type Priority = "Profit" | "Water Saving" | "Soil Health" | "Balanced";

export const PRIORITIES: Priority[] = ["Profit", "Water Saving", "Soil Health", "Balanced"];

/** POST /recommend: se envía farm_id O (lat y lon). */
export interface RecommendRequest {
  farm_id?: string;
  lat?: number;
  lon?: number;
  priority: Priority;
}

export interface DimensionScores {
  climate: number; // 0-100
  soil: number;    // 0-100
  market: number;  // 0-100
  total: number;   // suma ponderada según la prioridad
}

export interface RotationResult {
  id: string;            // "current", "rot_01", "rot_02"
  label: string;
  sequence: CropId[];    // 3 temporadas
  is_current: boolean;
  scores: DimensionScores;
  why: string;
  evidence: string[];
  benefits: string[];
  gaps: string[];
  risks: string[];
}

export interface RecommendResponse {
  farm_id: string;
  priority: Priority;
  best_rotation_id: string;
  rotations: [RotationResult, RotationResult, RotationResult]; // siempre 3, una es la actual
  data_notes: string[];
  disclaimer: string;
}

export interface Farm {
  farm_id: string;
  name: string;
  lat: number;
  lon: number;
  county_fips: string;
}
