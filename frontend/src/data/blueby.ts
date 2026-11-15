import type { Recommendation } from "@/types/recommendation";
import { priorityLabel, rotationName } from "@/data/labels";

export function bluebySummary(rec: Recommendation): string {
  const best = rec.rotations.find((rotation) => rotation.id === rec.best_rotation_id);
  if (!best) return "No crop plan is available yet.";
  return `For your ${priorityLabel(rec.priority).toLowerCase()} goal, the highest-scoring example is ${rotationName(best.sequence)}. ${best.why}`;
}
