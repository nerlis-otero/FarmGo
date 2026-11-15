import { RATING_DOT, RATING_WORDS, rating } from "@/data/labels";
import type { Rotation } from "@/types/recommendation";

function Indicator({
  emoji,
  label,
  meaning,
  score,
}: {
  emoji: string;
  label: string;
  meaning: string;
  score: number;
}) {
  const r = rating(score);
  return (
    <li className="flex items-center gap-3 rounded-lg bg-foam px-3 py-2.5">
      <span aria-hidden="true" className="text-2xl">{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{label}</p>
        <p className="text-sm leading-snug text-navy/70">{meaning}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold">
        <span className={`h-2.5 w-2.5 rounded-full ${RATING_DOT[r]}`} aria-hidden="true" />
        <span className="sr-only">{RATING_WORDS[r]}: </span>
        {score}/100
      </span>
    </li>
  );
}

export default function Indicators({ scores }: { scores: Rotation["scores"] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      <Indicator
        emoji="🌦️"
        label="Climate & water"
        meaning="Weather fit and how much water crops may need."
        score={scores.climate}
      />
      <Indicator
        emoji="🌱"
        label="Soil health"
        meaning="How this rotation may protect and support the soil."
        score={scores.soil}
      />
      <Indicator
        emoji="💰"
        label="Market potential"
        meaning="Example crop demand and earning potential, before costs."
        score={scores.market}
      />
    </ul>
  );
}
