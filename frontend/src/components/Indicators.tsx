import { RATING_DOT, RATING_WORDS, rating } from "@/data/labels";
import type { Rotation } from "@/types/recommendation";

function Indicator({ label, score }: { label: string; score: number }) {
  const r = rating(score);
  return (
    <li className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="flex items-center gap-2 font-bold">
        <span className={`h-3 w-3 rounded-full ${RATING_DOT[r]}`} aria-hidden="true" />
        {RATING_WORDS[r]}
      </span>
    </li>
  );
}

// Three indicators shown as words: water and climate, soil, and market.
export default function Indicators({ scores }: { scores: Rotation["scores"] }) {
  return (
    <ul className="flex flex-col gap-2">
      <Indicator label="Water and climate" score={scores.climate} />
      <Indicator label="Soil" score={scores.soil} />
      <Indicator label="Market" score={scores.market} />
    </ul>
  );
}
