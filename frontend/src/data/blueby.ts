import type { Recommendation } from "@/types/recommendation";
import { rotationName } from "@/data/labels";

export function bluebySummary(rec: Recommendation): string {
  const best = rec.rotations.find((rotation) => rotation.id === rec.best_rotation_id);
  if (!best) return "No crop plan is available yet.";
  const name = rotationName(best.sequence);
  return `Top plan for your goal: ${name}.`;
}
