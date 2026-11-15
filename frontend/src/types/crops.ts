import type { CropId } from "@/types/contracts";

export type CropLevel = "low" | "medium" | "high";

export interface CropOption {
  crop_id: CropId;
  family: string;
  drought_tolerance: CropLevel;
  water_mm_season_min: number;
  water_mm_season_max: number;
  fixes_nitrogen: boolean;
  erosion_protection: CropLevel;
  is_cover_crop: boolean;
  planting_window_tx: string;
  verified: boolean;
}
