import type {
  NdviPoint,
  Priority,
  Recommendation,
  Rotation,
} from "@/types/recommendation";

// ALL VALUES ARE MADE UP and are only for building the interface.
// Replace this function with a fetch when /recommend from Team Member 1 is ready.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function series(values: number[], flags: Record<number, "bare" | "stress">): NdviPoint[] {
  return values.map((value, i) => ({ month: MONTHS[i], value, flag: flags[i] }));
}

function countFlag(data: NdviPoint[], flag: "bare" | "stress") {
  return data.filter((p) => p.flag === flag).length;
}

function build(
  r: Omit<Rotation, "bareFieldMonths" | "stressMonths">,
): Rotation {
  return {
    ...r,
    bareFieldMonths: countFlag(r.ndvi, "bare"),
    stressMonths: countFlag(r.ndvi, "stress"),
  };
}

export function getMockRecommendation(farmId: string, priority: Priority): Recommendation {
  const rotations: Rotation[] = [
    build({
      id: "rot_01",
      crops: ["corn", "soybean", "oats_cover"],
      scores: { climate: 74, soil: 91, market: 72, overall: 82 },
      ndvi: series([0.22, 0.25, 0.35, 0.5, 0.62, 0.7, 0.66, 0.52, 0.4, 0.3, 0.24, 0.2], {
        0: "bare",
        11: "bare",
        7: "stress",
      }),
      reasons: [
        "Soybeans fix nitrogen after corn.",
        "Oats protect the soil between crops.",
      ],
      gaps: ["Check with your local agricultural extension service to confirm how much irrigation corn needs."],
    }),
    build({
      id: "rot_02",
      crops: ["cotton", "sorghum", "wheat"],
      scores: { climate: 88, soil: 70, market: 80, overall: 78 },
      ndvi: series([0.18, 0.2, 0.28, 0.4, 0.55, 0.6, 0.5, 0.35, 0.3, 0.28, 0.2, 0.18], {
        0: "bare",
        1: "bare",
        11: "bare",
        7: "stress",
        8: "stress",
      }),
      reasons: [
        "Sorghum and cotton tolerate dry periods well.",
        "Cotton has strong regional demand.",
      ],
      gaps: ["Check the availability of irrigation water for cotton."],
    }),
    build({
      id: "rot_03",
      crops: ["corn", "sorghum", "wheat"],
      scores: { climate: 70, soil: 48, market: 66, overall: 61 },
      ndvi: series([0.2, 0.22, 0.3, 0.45, 0.58, 0.52, 0.38, 0.3, 0.28, 0.25, 0.2, 0.18], {
        0: "bare",
        11: "bare",
        6: "stress",
        7: "stress",
        8: "stress",
      }),
      reasons: ["All three crops can be managed with similar equipment."],
      gaps: [
        "All three crops are grasses, so the rotation does not break pest and disease cycles.",
        "It doesn’t include a legume to add nitrogen.",
      ],
    }),
  ];

  return {
    farmId,
    priority,
    confidence: 0.7,
    isMock: true,
    rotations: [...rotations].sort((a, b) => b.scores.overall - a.scores.overall),
    gaps: [
      "NASA POWER soil moisture is modeled, not observed by satellite.",
      "Prices are estimates and don’t include all production costs.",
    ],
  };
}
