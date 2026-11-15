import Link from "next/link";
import Indicators from "@/components/Indicators";
import { OVERALL_WORDS, RATING_DOT, rating, rotationName } from "@/data/labels";
import type { Rotation } from "@/types/recommendation";

type Props = { rotation: Rotation; isBest: boolean; href: string };

export default function RotationCard({ rotation, isBest, href }: Props) {
  const { scores } = rotation;
  const overall = rating(scores.total);
  const title =
    rotation.sequence.length > 0 ? rotationName(rotation.sequence) : rotation.label;
  const whyLine =
    rotation.why.length > 110 ? `${rotation.why.slice(0, 107).trimEnd()}…` : rotation.why;

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl bg-white p-4 ${
        isBest ? "border-2 border-fern shadow-soft" : "border border-navy/15"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {isBest && (
          <p className="w-fit rounded-full bg-fern px-2.5 py-0.5 text-xs font-bold text-white">
            Best for your goal
          </p>
        )}
        {rotation.is_current && (
          <p className="w-fit rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold text-navy/80">
            Your crops
          </p>
        )}
      </div>

      <h3 className="text-lg font-bold leading-snug">{title}</h3>

      <p className="flex items-center gap-2 font-bold">
        <span className={`h-3 w-3 rounded-full ${RATING_DOT[overall]}`} aria-hidden="true" />
        {OVERALL_WORDS[overall]}
        <span className="font-semibold text-navy/55">· {scores.total}</span>
      </p>

      <div className="border-t border-navy/10 pt-2.5">
        <Indicators scores={scores} compact />
      </div>

      <p className="line-clamp-2 text-sm leading-snug text-navy/70">{whyLine}</p>

      <Link
        href={href}
        className={`mt-auto rounded-lg px-4 py-2.5 text-center font-bold transition ${
          isBest
            ? "bg-indigo text-white hover:bg-navy"
            : "border-2 border-navy/25 hover:bg-mist"
        }`}
      >
        See details
      </Link>
    </article>
  );
}
