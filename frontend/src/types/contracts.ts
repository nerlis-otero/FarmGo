/**
 * FarmFuture AI data contracts (mirrored from backend/app/contracts.py).
 * Keep the backend contract and docs/contracts.md in sync when changing these types.
 */

export type CropId =
  | "corn" | "cotton" | "sorghum" | "soybean"
  | "wheat" | "peanut" | "oats_cover" | "forage_grass";

export const CROP_IDS: CropId[] = [
  "corn",
  "cotton",
  "sorghum",
  "soybean",
  "wheat",
  "peanut",
  "oats_cover",
  "forage_grass",
];

export type Priority = "Profit" | "Water Saving" | "Soil Health" | "Balanced";

export const PRIORITIES: Priority[] = ["Profit", "Water Saving", "Soil Health", "Balanced"];

export const PRIORITY_WEIGHTS: Record<
  Priority,
  { climate: number; soil: number; market: number }
> = {
  Profit: { climate: 0.25, soil: 0.15, market: 0.6 },
  "Water Saving": { climate: 0.55, soil: 0.3, market: 0.15 },
  "Soil Health": { climate: 0.2, soil: 0.6, market: 0.2 },
  Balanced: { climate: 0.35, soil: 0.35, market: 0.3 },
};

/** POST /recommend accepts either farm_id or a latitude/longitude pair. */
export interface RecommendRequest {
  farm_id?: string;
  lat?: number;
  lon?: number;
  priority: Priority;
  current_crops?: CropId[];
}

export interface DimensionScores {
  climate: number; // 0-100
  soil: number;    // 0-100
  market: number;  // 0-100
  total: number;   // Weighted sum for the selected priority
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

export interface AgentAnalysisSummary {
  status: "complete" | "unavailable";
  score: number | null;
  recommendation: string | null;
  alternatives: string[];
  reasons: string[];
  error: string | null;
}

export interface AgentDiscussionSummary {
  agreements: string[];
  disagreements: string[];
  position: string | null;
  error: string | null;
}

export interface FarmerVerdict {
  best_crop_to_grow: string | null;
  best_crop_to_sell: string | null;
  recommended_rotation: string | null;
  best_overall_crop: string | null;
  reasoning: string;
  confidence: "low" | "medium" | "high";
  things_to_consider: string[];
  gaps: string[];
  judge_used: boolean;
}

export interface MultiAgentReport {
  climate: AgentAnalysisSummary;
  soil: AgentAnalysisSummary;
  market: AgentAnalysisSummary;
  discussion: Record<string, AgentDiscussionSummary>;
  verdict: FarmerVerdict;
}

export interface RecommendResponse {
  farm_id: string;
  priority: Priority;
  best_rotation_id: string;
  rotations: [RotationResult, RotationResult, RotationResult]; // siempre 3, una es la actual
  data_notes: string[];
  disclaimer: string;
  agent_report: MultiAgentReport | null;
}

export interface Farm {
  farm_id: string;
  name: string;
  lat: number;
  lon: number;
  county_fips: string;
}
