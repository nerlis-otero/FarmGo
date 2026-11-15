"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BluebyStage from "@/components/BluebyStage";
import RotationCard from "@/components/RotationCard";
import ScoreBar from "@/components/ScoreBar";
import { bluebySummary } from "@/data/blueby";
import { analyzeCropChoice } from "@/data/cropAnalysis";
import {
  CROP_NAMES,
  OVERALL_WORDS,
  RATING_DOT,
  parsePriority,
  priorityLabel,
  rating,
  rotationName,
} from "@/data/labels";
import { useCropCatalog } from "@/hooks/useCropCatalog";
import { useRecommendation } from "@/hooks/useRecommendation";
import { CROP_IDS, type CropId } from "@/types/contracts";

function Comparison() {
  const params = useSearchParams();
  const farm = params.get("farm") ?? "farm_1";
  const priority = parsePriority(params.get("priority"));
  const hasCrops = params.get("hasCrops") === "yes";
  const currentCrops = (params.get("currentCrops") ?? "")
    .split(",")
    .filter((crop): crop is CropId => CROP_IDS.includes(crop as CropId));
  const latParam = params.get("lat");
  const lonParam = params.get("lon");
  const lat = latParam === null ? null : Number(latParam);
  const lon = lonParam === null ? null : Number(lonParam);
  const { recommendation, source, loading, error, retry } = useRecommendation(
    farm,
    priority,
    lat,
    lon,
    currentCrops,
  );
  const {
    crops: cropCatalog,
    loading: cropsLoading,
    error: cropCatalogError,
  } = useCropCatalog();

  const queryParams = new URLSearchParams({
    farm,
    priority,
    hasCrops: hasCrops ? "yes" : "no",
  });
  if (currentCrops.length > 0) queryParams.set("currentCrops", currentCrops.join(","));
  if (latParam !== null) queryParams.set("lat", latParam);
  if (lonParam !== null) queryParams.set("lon", lonParam);
  const query = queryParams.toString();

  if (loading) {
    return (
      <p role="status" className="animate-pulse rounded-2xl bg-white/90 p-5 shadow-soft">
        Preparing your crop plans…
      </p>
    );
  }
  if (error || !recommendation) {
    return (
      <section role="alert" className="rounded-2xl bg-white/95 p-6 shadow-soft">
        <h1 className="text-2xl font-bold">We couldn’t load the crop plans</h1>
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

  const best = recommendation.rotations.find(
    (rotation) => rotation.id === recommendation.best_rotation_id,
  );
  const currentRotation = recommendation.rotations.find((rotation) => rotation.is_current);
  const suggestedRotations = recommendation.rotations.filter((rotation) => !rotation.is_current);
  const cropSuggestion =
    cropsLoading || cropCatalogError || (hasCrops && currentCrops.length === 0)
      ? null
      : analyzeCropChoice(recommendation, cropCatalog, hasCrops, currentCrops);
  const bestOverall = best ? rating(best.scores.total) : null;
  const bestTitle = best
    ? best.sequence.length > 0
      ? rotationName(best.sequence)
      : best.label
    : null;
  const dataChip =
    source === "saved-demo"
      ? "Demo fallback"
      : farm === "custom"
        ? "Live climate for your pin"
        : "Sample farm data";

  const formatCropText = (val: string | null | undefined) => {
    if (!val) return "";
    const clean = val.trim();
    const lower = clean.toLowerCase();
    if (CROP_NAMES[lower]) return CROP_NAMES[lower];
    return clean.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const suggestedRotationValue =
    bestTitle &&
    (!recommendation?.agent_report?.verdict?.recommended_rotation ||
      recommendation.agent_report.verdict.recommended_rotation.toLowerCase().startsWith("suggested rotation"))
      ? bestTitle
      : recommendation?.agent_report?.verdict?.recommended_rotation || bestTitle;

  const displayReasoning = recommendation?.agent_report?.verdict?.reasoning
    ? recommendation.agent_report.verdict.reasoning.replace(
        /Suggested rotation \d+/gi,
        bestTitle || "recommended rotation",
      )
    : "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="w-fit font-bold text-indigo underline underline-offset-4">
          ← Change farm or goal
        </Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold text-navy/75">
          {dataChip}
        </span>
      </div>

      <BluebyStage text={bluebySummary(recommendation)} compact />

      {best && bestTitle && bestOverall && (
        <section className="relative overflow-hidden rounded-3xl border-2 border-fern/50 bg-gradient-to-br from-foam via-white to-mist p-4 shadow-soft sm:p-6">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo via-straw to-bluebonnet" />
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-fern">
            Best plan · {priorityLabel(priority)}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{bestTitle}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 font-bold">
            <span className={`h-3 w-3 rounded-full ${RATING_DOT[bestOverall]}`} aria-hidden="true" />
            {OVERALL_WORDS[bestOverall]}
            <span className="font-semibold text-navy/70">· {best.scores.total}/100</span>
          </p>
          <ScoreBar score={best.scores.total} rating={bestOverall} className="mt-3 max-w-md" />
          {cropSuggestion?.crop && (
            <p className="mt-3 rounded-xl bg-white/85 px-3 py-2 font-semibold">
              {hasCrops ? "Crop to add: " : "Start with: "}
              <span className="text-fern">{CROP_NAMES[cropSuggestion.crop.crop_id]}</span>
            </p>
          )}
          <Link
            href={`/rotacion/${best.id}?${query}`}
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-indigo px-5 py-2.5 font-bold text-white hover:bg-navy"
          >
            Open best plan
          </Link>
        </section>
      )}

      {cropSuggestion?.crop && (
        <ul className="flex flex-wrap gap-2 text-sm">
          <li className="rounded-full bg-white/90 px-3 py-1 font-medium shadow-sm">
            {cropSuggestion.crop.drought_tolerance[0].toUpperCase() +
              cropSuggestion.crop.drought_tolerance.slice(1)}{" "}
            drought tolerance
          </li>
          <li className="rounded-full bg-white/90 px-3 py-1 font-medium shadow-sm">
            {cropSuggestion.crop.water_mm_season_min}–{cropSuggestion.crop.water_mm_season_max} mm
            water
          </li>
          {cropSuggestion.crop.fixes_nitrogen && (
            <li className="rounded-full bg-white/90 px-3 py-1 font-medium shadow-sm">
              Fixes nitrogen
            </li>
          )}
          {cropSuggestion.crop.is_cover_crop && (
            <li className="rounded-full bg-white/90 px-3 py-1 font-medium shadow-sm">
              Cover crop
            </li>
          )}
        </ul>
      )}

      {!cropsLoading && !cropSuggestion?.crop && (cropCatalogError || cropSuggestion) && (
        <p className="rounded-xl bg-white/90 px-4 py-3 text-sm text-navy/80">
          {cropCatalogError
            ? `Crop tip unavailable: ${cropCatalogError}`
            : cropSuggestion?.reason === "no-different-family-option"
              ? "No different crop family found in the example plans."
              : "You already grow every crop in these examples."}
        </p>
      )}

      {currentRotation && (
        <section className="rounded-xl border border-navy/10 bg-white/90 px-4 py-3">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-navy/70">Your crops</p>
          <p className="mt-1 font-bold">
            {currentRotation.sequence.length > 0
              ? rotationName(currentRotation.sequence)
              : currentRotation.label}
          </p>
          <p className="mt-1 text-sm text-navy/75">
            Baseline for comparison — not a suggested plan.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold sm:text-2xl">Suggested plans</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {suggestedRotations.map((rotation) => (
            <RotationCard
              key={rotation.id}
              rotation={rotation}
              isBest={rotation.id === recommendation.best_rotation_id}
              href={`/rotacion/${rotation.id}?${query}`}
            />
          ))}
        </div>
      </section>

      {recommendation.agent_report && (
        <section
          aria-labelledby="agent-verdict-heading"
          className="rounded-2xl border-2 border-fern/40 bg-foam p-5 shadow-soft sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-fern">
              Farm team verdict · {recommendation.agent_report.verdict.confidence} confidence
            </p>
            <span className="rounded-full bg-white/90 px-3 py-0.5 text-xs font-bold text-fern shadow-xs">
              Multi-Agent AI
            </span>
          </div>
          <h2 id="agent-verdict-heading" className="mt-1 text-2xl font-bold">
            What the specialists recommend
          </h2>
          <p className="mt-2 text-navy/85">{displayReasoning}</p>

          <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {[
              ["Best to grow", formatCropText(recommendation.agent_report.verdict.best_crop_to_grow)],
              ["Best to sell", formatCropText(recommendation.agent_report.verdict.best_crop_to_sell)],
              ["Suggested rotation", suggestedRotationValue],
              ["Best overall", formatCropText(recommendation.agent_report.verdict.best_overall_crop)],
            ].map(
              ([label, value]) =>
                value && (
                  <div key={label} className="rounded-xl bg-white/90 p-3 shadow-xs">
                    <dt className="text-xs font-bold uppercase tracking-wider text-navy/70">{label}</dt>
                    <dd className="mt-0.5 font-bold text-navy">{value}</dd>
                  </div>
                ),
            )}
          </dl>

          {recommendation.agent_report.verdict.things_to_consider.length > 0 && (
            <div className="mt-4 rounded-xl border border-straw/80 bg-white/80 p-3.5">
              <h3 className="font-bold text-sm text-navy">Things to check before planting</h3>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-navy/80">
                {recommendation.agent_report.verdict.things_to_consider.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendation.agent_report.verdict.gaps.length > 0 && (
            <div className="mt-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-navy/70">Missing information</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-navy/70">
                {recommendation.agent_report.verdict.gaps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(
              [
                ["Climate Specialist", recommendation.agent_report.climate],
                ["Soil & Rotation Specialist", recommendation.agent_report.soil],
                ["Market Specialist", recommendation.agent_report.market],
              ] as const
            ).map(([name, agent]) => (
              <article key={name} className="flex flex-col rounded-xl border border-navy/10 bg-white/90 p-4 shadow-xs">
                <h3 className="font-bold text-navy">{name}</h3>
                {agent.status === "unavailable" ? (
                  <p className="mt-2 text-sm text-low">{agent.error}</p>
                ) : (
                  <>
                    {agent.score !== null && (
                      <p className="mt-1 text-sm font-semibold text-fern">Score: {agent.score} / 100</p>
                    )}
                    {agent.recommendation && (
                      <p className="mt-2 text-sm font-medium text-navy">{agent.recommendation}</p>
                    )}
                    {agent.reasons.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-navy/75">
                        {agent.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>

          {Object.values(recommendation.agent_report.discussion).some(
            (agent) =>
              agent.position ||
              agent.agreements.length > 0 ||
              agent.disagreements.length > 0 ||
              agent.error,
          ) && (
            <div className="mt-4 rounded-xl border border-navy/10 bg-white/80 p-4">
              <h3 className="font-bold text-navy text-sm uppercase tracking-wide">Multi-Agent Discussion</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {Object.entries(recommendation.agent_report.discussion).map(([name, agent]) => (
                  <li key={name}>
                    <strong className="capitalize text-navy">{name}:</strong>{" "}
                    <span className="text-navy/85">
                      {agent.error ?? agent.position ?? "No discussion summary is available."}
                    </span>
                    {agent.agreements.length > 0 && (
                      <span className="block text-xs text-navy/70 mt-0.5">
                        • Shared points: {agent.agreements.join("; ")}
                      </span>
                    )}
                    {agent.disagreements.length > 0 && (
                      <span className="block text-xs text-navy/70 mt-0.5">
                        • Points of difference: {agent.disagreements.join("; ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {source === "saved-demo" && (
        <div className="rounded-xl border border-straw/80 bg-straw/40 px-4 py-3 text-sm">
          <p className="font-bold">Live recommendation service was offline</p>
          <p className="mt-1 text-navy/80">
            Showing saved Lubbock examples instead. Start the backend on port 8000 and reload to get
            location-based plans.
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 font-bold text-indigo underline underline-offset-2"
          >
            Retry live results
          </button>
        </div>
      )}

      <details className="panel rounded-2xl border border-navy/10 bg-mist/80">
        <summary className="flex items-center justify-between gap-3 px-4 py-3 font-bold sm:px-5">
          <span>About the data</span>
          <span className="text-sm font-semibold text-navy/70">Show details</span>
        </summary>
        <div className="border-t border-navy/10 px-4 py-4 text-sm text-navy/80 sm:px-5">
          <p>
            {source === "saved-demo"
              ? "These are saved demo scores, not results for your marked field."
              : farm === "custom"
                ? "Climate uses NASA POWER for your pin. Soil and market scores are regional estimates, not field measurements."
                : "Scores use sample farm data for this example."}
          </p>
          {recommendation.data_notes.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {recommendation.data_notes
                .filter(
                  (note) =>
                    !note.includes("recommendation API is unavailable") &&
                    !note.includes("Saved Lubbock example results are shown"),
                )
                .map((note) => (
                  <li key={note}>{note}</li>
                ))}
            </ul>
          )}
          <p className="mt-2">{recommendation.disclaimer}</p>
        </div>
      </details>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<p role="status">Loading your plans…</p>}>
      <Comparison />
    </Suspense>
  );
}
