"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import BluebyStage from "@/components/BluebyStage";
import Indicators from "@/components/Indicators";
import NdviChart from "@/components/NdviChart";
import { priorityLabel, rotationName } from "@/data/labels";
import { getMockRecommendation } from "@/data/mock";
import type { Priority } from "@/types/recommendation";

function Detail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const farm = params.get("farm") ?? "farm_1";
  const priority = (params.get("priority") ?? "balanced") as Priority;
  const keep = new URLSearchParams({ farm, priority });
  const lat = params.get("lat");
  const lon = params.get("lon");
  if (lat && lon) {
    keep.set("lat", lat);
    keep.set("lon", lon);
  }
  const backHref = `/comparar?${keep.toString()}`;

  const rec = getMockRecommendation(farm, priority);
  const rotation = rec.rotations.find((r) => r.id === id);

  if (!rotation) {
    return (
      <div className="flex flex-col gap-3">
        <p>We couldn’t find that option.</p>
        <Link href={backHref} className="font-bold text-indigo underline">
          Back to my 3 options
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href={backHref} className="font-bold text-indigo underline">
          Back to my 3 options
        </Link>
      </div>

      <BluebyStage text={`Here’s why: ${rotation.reasons.join(" ")}`} />

      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{rotationName(rotation.crops)}</h1>
        <p>
          Based on your priority: <strong>{priorityLabel(priority)}</strong>.
        </p>
        {rec.isMock && (
          <p className="mt-1 w-fit rounded-md bg-straw px-3 py-1 font-bold">Sample data</p>
        )}
      </section>

      <section className="max-w-md rounded-xl border border-navy/20 bg-white p-5">
        <h2 className="mb-3 text-2xl font-bold">How it performs</h2>
        <Indicators scores={rotation.scores} />
      </section>

      <section className="rounded-xl border border-navy/20 bg-white p-5">
        <h2 className="text-2xl font-bold">Your crop’s growth throughout the year</h2>
        <p className="mb-4 mt-1 text-navy/80">
          Months with bare fields: {rotation.bareFieldMonths}. Months with crop stress:{" "}
          {rotation.stressMonths}.
        </p>
        <NdviChart data={rotation.ndvi} />
      </section>

      <section className="rounded-xl bg-mist p-5">
        <h2 className="text-2xl font-bold">Before you decide</h2>
        <p className="mt-1">Confirm these details with a local expert. Keep in mind:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {[...rotation.gaps, ...rec.gaps].map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function RotationDetailPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <Detail />
    </Suspense>
  );
}
