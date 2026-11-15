import Link from "next/link";
import Indicators from "@/components/Indicators";
import { OVERALL_WORDS, RATING_DOT, rating, rotationName } from "@/data/labels";
import type { Rotation } from "@/types/recommendation";

type Props = { rotation: Rotation; isBest: boolean; href: string };

export default function RotationCard({ rotation, isBest, href }: Props) {
  const { scores } = rotation;
  const overall = rating(scores.total);

  return (
    <article
      className={`flex flex-col gap-4 rounded-xl bg-white p-5 ${
        isBest ? "border-2 border-fern" : "border border-navy/20"
      }`}
    >
      <div className="flex flex-wrap gap-2">
        {isBest && (
          <p className="w-fit rounded-full bg-fern px-3 py-1 text-sm font-bold text-white">
            Top score for your goal
          </p>
        )}
        {rotation.is_current && (
          <p className="w-fit rounded-full bg-mist px-3 py-1 text-sm font-bold">
            Example current rotation
          </p>
        )}
      </div>

      <h3 className="text-xl font-bold leading-snug">
        {rotation.sequence.length > 0 ? rotationName(rotation.sequence) : rotation.label}
      </h3>

      <div>
        <p className="flex items-center gap-2 font-bold">
          <span className={`h-3 w-3 rounded-full ${RATING_DOT[overall]}`} aria-hidden="true" />
          {OVERALL_WORDS[overall]}
        </p>
        <p className="text-navy/70">{scores.total} out of 100</p>
      </div>

      <div className="border-t border-navy/10 pt-4">
        <Indicators scores={scores} />
      </div>

      <p>{rotation.why}</p>

      <Link
        href={href}
        className="mt-auto rounded-lg border-2 border-navy px-4 py-3 text-center font-bold hover:bg-mist"
      >
        See plan details
      </Link>
    </article>
  );
}
