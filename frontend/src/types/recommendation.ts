// DRAFT. Update this file to match the official /recommend JSON exactly
// when Team Member 1 publishes contracts.md.

export type Priority = "profit" | "water_saving" | "soil_health" | "balanced";

export type NdviPoint = {
  month: string;
  value: number; // 0 a 1
  flag?: "bare" | "stress"; // bare field or crop stress
};

export type Rotation = {
  id: string; // "rot_01"
  crops: string[]; // IDs de cultivos acordados: "corn", "soybean", ...
  scores: { climate: number; soil: number; market: number; overall: number };
  ndvi: NdviPoint[];
  bareFieldMonths: number;
  stressMonths: number;
  reasons: string[];
  gaps: string[]; // what a local expert should check
};

export type Recommendation = {
  farmId: string;
  priority: Priority;
  confidence: number; // 0 a 1
  isMock?: boolean;
  rotations: Rotation[]; // the 3 rotations, ranked from best to weakest
  gaps: string[];
};
