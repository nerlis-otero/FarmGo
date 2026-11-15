"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import BluebyStage from "@/components/BluebyStage";
import Indicators from "@/components/Indicators";
import { getDemoRecommendation } from "@/data/demo";
import { parsePriority, priorityLabel, rotationName } from "@/data/labels";

function Detail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const farm = params.get("farm") ?? "farm_1";
  const priority = parsePriority(params.get("priority"));
  const recommendation = getDemoRecommendation(farm, priority);
  const query = new URLSearchParams({ farm, priority }).toString();
  const backHref = `/comparar?${query}`;
  const rotation = recommendation.rotations.find((result) => result.id === id);

  if (!rotation) {
    return (
      <section className="rounded-2xl bg-white/95 p-6 shadow-soft">
        <h1 className="text-2xl font-bold">We couldn’t find that sample plan.</h1>
        <Link href={backHref} className="mt-4 inline-block font-bold text-indigo underline">
          Back to sample plans
        </Link>
      </section>
    );
  }

  const sections = [
    { title: "Benefits", items: rotation.benefits },
    { title: "Example evidence", items: rotation.evidence },
    { title: "Things to check", items: rotation.gaps },
    { title: "Possible trade-offs", items: rotation.risks },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="flex flex-col gap-7">
      <Link href={backHref} className="w-fit font-bold text-indigo underline underline-offset-4">
        ← Back to sample plans
      </Link>

      <div className="rounded-xl border border-straw/80 bg-white/90 px-4 py-3 shadow-sm">
        <p className="font-bold text-navy">Demo preview — illustrative results only</p>
        <p className="text-base text-navy/70">
          This example is not based on live farm data or a real agronomic assessment.
        </p>
      </div>

      <BluebyStage text={rotation.why} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {rotation.id === recommendation.best_rotation_id && (
            <span className="rounded-full bg-fern px-3 py-1 text-sm font-bold text-white">
              Top example for your goal
            </span>
          )}
          {rotation.is_current && (
            <span className="rounded-full bg-mist px-3 py-1 text-sm font-bold">
              Example current rotation
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold sm:text-4xl">{rotationName(rotation.sequence)}</h1>
        <p>
          Sample plan for: <strong>{priorityLabel(priority)}</strong>
        </p>
      </section>

      <section className="max-w-xl rounded-2xl border border-navy/10 bg-white/95 p-5 shadow-soft">
        <h2 className="mb-4 text-2xl font-bold">How this sample scores</h2>
        <Indicators scores={rotation.scores} />
        <p className="mt-4 border-t border-navy/10 pt-3 font-bold">
          Overall example score: {rotation.scores.total} out of 100
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-navy/10 bg-white/95 p-5 shadow-sm"
          >
            <h2 className="text-xl font-bold">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-navy/80">
              {section.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-2xl bg-mist/90 p-5">
        <h2 className="text-xl font-bold">Please remember</h2>
        <p className="mt-2 text-base">{recommendation.disclaimer}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-base text-navy/80">
          {recommendation.data_notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      </section>
    </div>
  );
}

export default function RotationDetailPage() {
  return (
    <Suspense fallback={<p role="status">Loading sample plan…</p>}>
      <Detail />
    </Suspense>
  );
}
