import type { CropId, RecommendResponse, RotationResult } from "@/types/contracts";
import type { CropOption } from "@/types/crops";

export interface CropSuggestion {
  crop: CropOption | null;
  rotation: RotationResult;
  reason: "all-example-crops-already-grown" | "no-different-family-option" | null;
}

function suggestedRotations(recommendation: RecommendResponse) {
  return recommendation.rotations
    .filter((rotation) => !rotation.is_current)
    .sort((first, second) => second.scores.total - first.scores.total);
}

export function analyzeCropChoice(
  recommendation: RecommendResponse,
  cropCatalog: CropOption[],
  hasCurrentCrops: boolean,
  currentCrops: CropId[],
): CropSuggestion {
  const rotations = suggestedRotations(recommendation);
  const bestRotation = rotations[0] ?? recommendation.rotations[0];

  if (!hasCurrentCrops) {
    const crop = bestRotation.sequence[0];
    return {
      crop: cropCatalog.find((option) => option.crop_id === crop) ?? null,
      rotation: bestRotation,
      reason: null,
    };
  }

  const currentFamilies = new Set(
    currentCrops
      .map((cropId) => cropCatalog.find((option) => option.crop_id === cropId)?.family)
      .filter((family): family is string => family !== undefined),
  );
  const newCrops = rotations.flatMap((rotation) =>
    rotation.sequence
      .filter((cropId) => !currentCrops.includes(cropId))
      .map((cropId) => ({
        crop: cropCatalog.find((option) => option.crop_id === cropId),
        rotation,
      }))
      .filter((suggestion) => suggestion.crop !== undefined),
  );

  const differentFamilyOption = newCrops.find(
    ({ crop }) => crop && !currentFamilies.has(crop.family),
  );
  if (differentFamilyOption?.crop) {
    return {
      crop: differentFamilyOption.crop,
      rotation: differentFamilyOption.rotation,
      reason: null,
    };
  }

  if (newCrops.length === 0) {
    return { crop: null, rotation: bestRotation, reason: "all-example-crops-already-grown" };
  }

  return {
    crop: null,
    rotation: newCrops[0].rotation,
    reason: "no-different-family-option",
  };
}
