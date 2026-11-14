"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BluebyStage from "@/components/BluebyStage";
import NdviChart from "@/components/NdviChart";
import RotationCard from "@/components/RotationCard";
import { bluebySummary } from "@/data/blueby";
import { priorityLabel, rotationName } from "@/data/labels";
import { getMockRecommendation } from "@/data/mock";
import type { Priority } from "@/types/recommendation";

function Comparison() {
  const params = useSearchParams();
  const farm = params.get("farm") ?? "farm_1";
  const priority = (params.get("priority") ?? "balanced") as Priority;
  const rec = getMockRecommendation(farm, priority);
  const [ndviId, setNdviId] = useState(rec.rotations[0].id);
  const ndviRotation = rec.rotations.find((r) => r.id === ndviId) ?? rec.rotations[0];

  // Keep lat and lon for when the real API (/recommend) is connected.
  const keep = new URLSearchParams({ farm, priority });
  const lat = params.get("lat");
  const lon = params.get("lon");
  if (lat && lon) {
    keep.set("lat", lat);
    keep.set("lon", lon);
  }
  const query = keep.toString();

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href="/" className="font-bold text-indigo underline">
          Start over
        </Link>
      </div>

      <BluebyStage text={bluebySummary(rec)} />

      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Your 3 crop rotation options</h1>
        <p>
          Ranked from best to weakest based on your priority:{" "}
          <strong>{priorityLabel(priority)}</strong>.
        </p>
        <p className="text-navy/80">
          A crop rotation is the order in which you grow crops season after season.
        </p>
        {rec.isMock && (
          <p className="mt-1 w-fit rounded-md bg-straw px-3 py-1 font-bold">Sample data</p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {rec.rotations.map((r, i) => (
          <RotationCard
            key={r.id}
            rotation={r}
            isBest={i === 0}
            href={`/rotacion/${r.id}?${query}`}
          />
        ))}
      </section>

      <section className="rounded-xl border border-navy/20 bg-white p-5">
        <h2 className="text-2xl font-bold">Your crop’s growth throughout the year</h2>
        <p className="mb-4 mt-1 text-navy/80">
          The line shows how green and healthy the field is each month, measured using satellite
          imagery.
        </p>
        <div className="mb-4 flex flex-wrap gap-3">
          {rec.rotations.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={ndviRotation.id === r.id}
              onClick={() => setNdviId(r.id)}
              className={`rounded-lg border-2 px-4 py-2 font-bold ${
                ndviRotation.id === r.id
                  ? "border-indigo bg-indigo text-white"
                  : "border-navy hover:bg-mist"
              }`}
            >
              {rotationName(r.crops)}
            </button>
          ))}
        </div>
        <NdviChart data={ndviRotation.ndvi} />
      </section>

      <section className="rounded-xl bg-mist p-5">
        <h2 className="text-2xl font-bold">Before you decide</h2>
        <p className="mt-1">Confirm these details with a local expert. Keep in mind:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {rec.gaps.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<p>Loading your options…</p>}>
      <Comparison />
    </Suspense>
  );
}
