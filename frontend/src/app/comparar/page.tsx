"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BluebyStage from "@/components/BluebyStage";
import RotationCard from "@/components/RotationCard";
import { bluebySummary } from "@/data/blueby";
import { getDemoRecommendation } from "@/data/demo";
import { parsePriority, priorityLabel } from "@/data/labels";
import type { RecommendResponse } from "@/types/contracts";

function Comparison() {
  const params = useSearchParams();
  const farm = params.get("farm") ?? "farm_1";
  const priority = parsePriority(params.get("priority"));
  const recommendation: RecommendResponse = getDemoRecommendation(farm, priority);

  const query = new URLSearchParams({ farm, priority }).toString();
  const best = recommendation.rotations.find(
    (rotation) => rotation.id === recommendation.best_rotation_id,
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="w-fit font-bold text-indigo underline underline-offset-4">
        ← Change farm or priority
      </Link>

      <div className="rounded-xl border border-straw/80 bg-white/90 px-4 py-3 shadow-sm">
        <p className="font-bold text-navy">Demo preview — illustrative results only</p>
        <p className="text-base text-navy/70">
          These sample crop plans and scores are not based on live farm data.
        </p>
      </div>

      <BluebyStage text={bluebySummary(recommendation)} />

      <section>
        <p className="mb-1 text-sm font-bold uppercase tracking-[0.14em] text-fern">
          Your goal: {priorityLabel(priority)}
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">Compare sample crop plans</h1>
        <p className="mt-2 max-w-3xl text-navy/75">
          A crop rotation is the order in which you grow crops across seasons. Compare each plan,
          then open its details to see the example benefits and trade-offs.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {recommendation.rotations.map((rotation) => (
          <RotationCard
            key={rotation.id}
            rotation={rotation}
            isBest={rotation.id === recommendation.best_rotation_id}
            href={`/rotacion/${rotation.id}?${query}`}
          />
        ))}
      </section>

      {best && (
        <section className="rounded-2xl border border-fern/20 bg-white/95 p-5 shadow-soft sm:p-6">
          <p className="mb-1 text-sm font-bold uppercase tracking-[0.14em] text-fern">
            Why this sample ranks first
          </p>
          <h2 className="text-2xl font-bold">{best.label}</h2>
          <p className="mt-2">{best.why}</p>
          {best.benefits.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-navy/80">
              {best.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-2xl bg-mist/90 p-5">
        <h2 className="text-xl font-bold">About this demo</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-navy/80">
          {recommendation.data_notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
        <p className="mt-3 text-base">{recommendation.disclaimer}</p>
      </section>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<p role="status">Loading your sample plans…</p>}>
      <Comparison />
    </Suspense>
  );
}
