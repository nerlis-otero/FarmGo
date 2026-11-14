import Link from "next/link";
import Indicators from "@/components/Indicators";
import { OVERALL_WORDS, RATING_DOT, rating, rotationName } from "@/data/labels";
import type { Rotation } from "@/types/recommendation";

type Props = { rotation: Rotation; isBest: boolean; href: string };

export default function RotationCard({ rotation, isBest, href }: Props) {
  const { scores } = rotation;
  const overall = rating(scores.overall);

  return (
    <article
      className={`flex flex-col gap-4 rounded-xl bg-white p-5 ${
        isBest ? "border-2 border-fern" : "border border-navy/20"
      }`}
    >
      {isBest && (
        <p className="w-fit rounded-md bg-fern px-3 py-1 font-bold text-white">
          Best fit for you
        </p>
      )}

      <h3 className="text-xl font-bold leading-snug">{rotationName(rotation.crops)}</h3>

      <div>
        <p className="flex items-center gap-2 font-bold">
          <span className={`h-3 w-3 rounded-full ${RATING_DOT[overall]}`} aria-hidden="true" />
          {OVERALL_WORDS[overall]}
        </p>
        <p className="text-navy/70">{scores.overall} out of 100</p>
      </div>

      <div className="border-t border-navy/10 pt-4">
        <Indicators scores={scores} />
      </div>

      {rotation.reasons[0] && <p>{rotation.reasons[0]}</p>}

      <Link
        href={href}
        className="mt-auto rounded-lg border-2 border-navy px-4 py-3 text-center font-bold hover:bg-mist"
      >
        View details
      </Link>
    </article>
  );
}
