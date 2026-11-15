"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import BluebyStage from "@/components/BluebyStage";
import Indicators from "@/components/Indicators";
import {
  OVERALL_WORDS,
  RATING_DOT,
  parsePriority,
  priorityLabel,
  rating,
  rotationName,
} from "@/data/labels";
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
    return (
      <p role="status" className="rounded-xl bg-white/90 p-5">
        Loading plan details…
      </p>
    );
  }
  if (error || !recommendation) {
    return (
      <section role="alert" className="rounded-2xl bg-white/95 p-6 shadow-soft">
        <h1 className="text-2xl font-bold">We couldn’t load this plan</h1>
        <p className="mt-2">{error}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-4 rounded-lg bg-indigo px-5 py-3 font-bold text-white"
        >
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

  const overall = rating(rotation.scores.total);
  const primarySections = [
    { title: "Potential benefits", items: rotation.benefits },
    { title: "Things to check", items: rotation.gaps },
  ].filter((section) => section.items.length > 0);
  const moreSections = [
    { title: "Example evidence", items: rotation.evidence },
    { title: "Possible trade-offs", items: rotation.risks },
  ].filter((section) => section.items.length > 0);
  const dataChip =
    source === "saved-demo"
      ? "Demo fallback"
      : farm === "custom"
        ? "Live climate for your pin"
        : "Sample farm data";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={backHref} className="w-fit font-bold text-indigo underline underline-offset-4">
          ← Back to plans
        </Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold text-navy/75">
          {dataChip}
        </span>
      </div>

      <BluebyStage
        text={
          rotation.why.length > 90
            ? `${OVERALL_WORDS[overall]} for your ${priorityLabel(priority).toLowerCase()} goal.`
            : rotation.why
        }
        compact
      />

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {rotation.id === recommendation.best_rotation_id && (
            <span className="rounded-full bg-fern px-2.5 py-0.5 text-xs font-bold text-white">
              Best for your goal
            </span>
          )}
          {rotation.is_current && (
            <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold text-navy/80">
              Your crops
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold sm:text-4xl">
          {rotation.sequence.length > 0 ? rotationName(rotation.sequence) : rotation.label}
        </h1>
        <p className="flex flex-wrap items-center gap-2 font-bold">
          <span className={`h-3 w-3 rounded-full ${RATING_DOT[overall]}`} aria-hidden="true" />
          {OVERALL_WORDS[overall]}
          <span className="font-semibold text-navy/55">· {rotation.scores.total}/100</span>
          <span className="font-medium text-navy/55">· {priorityLabel(priority)}</span>
        </p>
        <p className="text-navy/75">{rotation.why}</p>
      </section>

      <section className="max-w-xl rounded-2xl border border-navy/10 bg-white/95 p-4 shadow-soft sm:p-5">
        <h2 className="mb-3 text-lg font-bold">Scores</h2>
        <Indicators scores={rotation.scores} />
      </section>

      {primarySections.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {primarySections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-navy/10 bg-white/95 p-4 shadow-sm sm:p-5"
            >
              <h2 className="text-lg font-bold">{section.title}</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-navy/80">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {moreSections.length > 0 && (
        <details className="panel rounded-2xl border border-navy/10 bg-white/95 shadow-sm">
          <summary className="flex items-center justify-between gap-3 px-4 py-3 font-bold sm:px-5">
            <span>More detail</span>
            <span className="text-sm font-semibold text-navy/55">Show</span>
          </summary>
          <div className="grid gap-3 border-t border-navy/10 p-4 sm:grid-cols-2 sm:p-5">
            {moreSections.map((section) => (
              <section key={section.title}>
                <h2 className="font-bold">{section.title}</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-navy/80">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </details>
      )}

      <details className="panel rounded-2xl border border-navy/10 bg-mist/80">
        <summary className="flex items-center justify-between gap-3 px-4 py-3 font-bold sm:px-5">
          <span>About the data</span>
          <span className="text-sm font-semibold text-navy/55">Show</span>
        </summary>
        <div className="border-t border-navy/10 px-4 py-4 text-sm text-navy/80 sm:px-5">
          <p>{recommendation.disclaimer}</p>
          {recommendation.data_notes.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {recommendation.data_notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      </details>
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
