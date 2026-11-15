import ScoreBar from "@/components/ScoreBar";
import { RATING_DOT, RATING_WORDS, rating } from "@/data/labels";
import type { Rotation } from "@/types/recommendation";

function Indicator({
  label,
  meaning,
  score,
  compact,
}: {
  label: string;
  meaning?: string;
  score: number;
  compact?: boolean;
}) {
  const r = rating(score);
  return (
    <li className={`rounded-lg bg-foam ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
      <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-navy">{label}</p>
        {!compact && meaning && (
          <p className="text-xs leading-snug text-navy/70">{meaning}</p>
        )}
      </div>
      <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold">
        <span className={`h-2.5 w-2.5 rounded-full ${RATING_DOT[r]}`} aria-hidden="true" />
        <span className="sr-only">{RATING_WORDS[r]}: </span>
        {score}
      </span>
      </div>
      <ScoreBar score={score} rating={r} className="mt-1.5" />
    </li>
  );
}

export default function Indicators({
  scores,
  compact = false,
}: {
  scores: Rotation["scores"];
  compact?: boolean;
}) {
  return (
    <ul className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
      <Indicator
        label="Climate"
        meaning="Weather fit and how much water crops may need."
        score={scores.climate}
        compact={compact}
      />
      <Indicator
        label="Soil"
        meaning="How this rotation may protect and support the soil."
        score={scores.soil}
        compact={compact}
      />
      <Indicator
        label="Market"
        meaning="Example crop demand and earning potential, before costs."
        score={scores.market}
        compact={compact}
      />
    </ul>
  );
}
