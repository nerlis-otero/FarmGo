"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import BluebyStage from "@/components/BluebyStage";
import Indicators from "@/components/Indicators";
import { parsePriority, priorityLabel, rotationName } from "@/data/labels";
import { useRecommendation } from "@/hooks/useRecommendation";
import { CROP_IDS, type CropId } from "@/types/contracts";

function Detail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const farm = params.get("farm") ?? "farm_1";
  const priority = parsePriority(params.get("priority"));
  const hasCrops = params.get("hasCrops") === "yes";
  const latParam = params.get("lat");
  const lonParam = params.get("lon");
  const lat = latParam === null ? null : Number(latParam);
  const lon = lonParam === null ? null : Number(lonParam);
  const currentCrops = (params.get("currentCrops") ?? "")
    .split(",")
    .filter((crop): crop is CropId => CROP_IDS.includes(crop as CropId));
  const { recommendation, source, loading, error, retry } = useRecommendation(
    farm,
    priority,
    lat,
    lon,
    currentCrops,
  );
  const queryParams = new URLSearchParams({
    farm,
    priority,
    hasCrops: hasCrops ? "yes" : "no",
  });
  const currentCropsParam = params.get("currentCrops");
  if (currentCropsParam) queryParams.set("currentCrops", currentCropsParam);
  if (latParam !== null) queryParams.set("lat", latParam);
  if (lonParam !== null) queryParams.set("lon", lonParam);
  const query = queryParams.toString();
  const backHref = `/comparar?${query}`;

  if (loading) {
    return <p role="status" className="rounded-xl bg-white/90 p-5">Loading plan details…</p>;
  }
  if (error || !recommendation) {
    return (
      <section role="alert" className="rounded-2xl bg-white/95 p-6 shadow-soft">
        <h1 className="text-2xl font-bold">We couldn’t load this plan</h1>
        <p className="mt-2">{error}</p>
        <button type="button" onClick={retry} className="mt-4 rounded-lg bg-indigo px-5 py-3 font-bold text-white">
          Try again
        </button>
      </section>
    );
  }
  const rotation = recommendation.rotations.find((result) => result.id === id);

  if (!rotation) {
    return (
      <section className="rounded-2xl bg-white/95 p-6 shadow-soft">
        <h1 className="text-2xl font-bold">We couldn’t find that plan.</h1>
        <Link href={backHref} className="mt-4 inline-block font-bold text-indigo underline">
          Back to crop plans
        </Link>
      </section>
    );
  }

  const sections = [
    { title: "Potential benefits", items: rotation.benefits },
    { title: "Example evidence", items: rotation.evidence },
    { title: "Things to check", items: rotation.gaps },
    { title: "Possible trade-offs", items: rotation.risks },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="flex flex-col gap-7">
      <Link href={backHref} className="w-fit font-bold text-indigo underline underline-offset-4">
        ← Back to crop plans
      </Link>

      <div className="rounded-xl border border-straw/80 bg-white/90 px-4 py-3 shadow-sm">
        <p className="font-bold text-navy">
          {source === "saved-demo"
            ? "Using saved demo results"
            : farm === "custom"
              ? "Climate data for your marked location"
              : "Sample data: High Plains (Lubbock)"}
        </p>
        <p className="text-base text-navy/70">
          {source === "saved-demo"
            ? "Location-based climate data could not be loaded, so these saved Lubbock examples are shown instead. They do not use your marked location."
            : farm === "custom"
              ? "Climate scores use NASA POWER data for the coordinates you marked. Soil scores use draft crop traits, and market scores use Texas-wide data where available; neither is measured for your field."
              : "This example uses Lubbock test data, not your field data. Scores reflect the goal you selected."}
        </p>
      </div>

      <BluebyStage text={rotation.why} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {rotation.id === recommendation.best_rotation_id && (
            <span className="rounded-full bg-fern px-3 py-1 text-sm font-bold text-white">
              Top score for your goal
            </span>
          )}
          {rotation.is_current && (
            <span className="rounded-full bg-mist px-3 py-1 text-sm font-bold">
              Example current rotation
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold sm:text-4xl">
          {rotation.sequence.length > 0 ? rotationName(rotation.sequence) : rotation.label}
        </h1>
        <p>
          Your goal: <strong>{priorityLabel(priority)}</strong>
        </p>
      </section>

      <section className="max-w-xl rounded-2xl border border-navy/10 bg-white/95 p-5 shadow-soft">
        <h2 className="mb-4 text-2xl font-bold">How is this plan scored?</h2>
        <Indicators scores={rotation.scores} />
        <p className="mt-4 border-t border-navy/10 pt-3 font-bold">
          Overall score for this goal: {rotation.scores.total} out of 100
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
        <h2 className="text-xl font-bold">Before you decide</h2>
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
    <Suspense fallback={<p role="status">Loading plan…</p>}>
      <Detail />
    </Suspense>
  );
}
