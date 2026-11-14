import type { Recommendation } from "@/types/recommendation";
import { confidenceLabel, priorityLabel, rotationSentence } from "@/data/labels";

// Text Blueby says when showing the comparison.
// When the Reasoning Agent is available, use its "summary" field instead of building one here.
export function bluebySummary(rec: Recommendation): string {
  const best = rec.rotations[0];
  const parts = [
    `For “${priorityLabel(rec.priority)},” I recommend planting ${rotationSentence(best.crops)}.`,
  ];
  if (best.reasons[0]) parts.push(best.reasons[0]);
  parts.push(`Confidence: ${confidenceLabel(rec.confidence)}.`);
  if (rec.isMock) parts.push("Note: this is sample data for now.");
  return parts.join(" ");
}
