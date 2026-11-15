"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BluebyStage from "@/components/BluebyStage";
import RotationCard from "@/components/RotationCard";
import { bluebySummary } from "@/data/blueby";
import { analyzeCropChoice } from "@/data/cropAnalysis";
import { CROP_NAMES, parsePriority, priorityLabel } from "@/data/labels";
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
    return <p role="status" className="rounded-xl bg-white/90 p-5">Preparing your crop plans…</p>;
  }
  if (error || !recommendation) {
    return (
      <section role="alert" className="rounded-2xl bg-white/95 p-6 shadow-soft">
        <h1 className="text-2xl font-bold">We couldn’t load the crop plans</h1>
        <p className="mt-2">{error}</p>
        <button type="button" onClick={retry} className="mt-4 rounded-lg bg-indigo px-5 py-3 font-bold text-white">
          Try again
        </button>
      </section>
    );
  }

  const best = recommendation.rotations.find(
    (rotation) => rotation.id === recommendation.best_rotation_id,
  );
  const cropSuggestion = cropsLoading || cropCatalogError || (hasCrops && currentCrops.length === 0)
    ? null
    : analyzeCropChoice(recommendation, cropCatalog, hasCrops, currentCrops);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="w-fit font-bold text-indigo underline underline-offset-4">
        ← Change farm or goal
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
              : "The backend recalculates scores for your goal, but it currently uses Lubbock test data. Your selected location does not change this example."}
        </p>
      </div>

      <BluebyStage text={bluebySummary(recommendation)} />

      {recommendation.agent_report && (
        <section
          aria-labelledby="agent-verdict-heading"
          className="rounded-2xl border-2 border-fern/40 bg-foam p-5 shadow-soft sm:p-6"
        >
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-fern">
            Farm team verdict · {recommendation.agent_report.verdict.confidence} confidence
          </p>
          <h2 id="agent-verdict-heading" className="mt-1 text-2xl font-bold">
            What the specialists recommend
          </h2>
          <p className="mt-2">{recommendation.agent_report.verdict.reasoning}</p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Best crop to grow", recommendation.agent_report.verdict.best_crop_to_grow],
              ["Best crop to sell", recommendation.agent_report.verdict.best_crop_to_sell],
              ["Suggested rotation", recommendation.agent_report.verdict.recommended_rotation],
              ["Best overall crop", recommendation.agent_report.verdict.best_overall_crop],
            ].map(([label, value]) => value && (
              <div key={label} className="rounded-xl bg-white/80 p-3">
                <dt className="text-sm font-bold text-navy/70">{label}</dt>
                <dd className="mt-1 font-bold">{value}</dd>
              </div>
            ))}
          </dl>

          {recommendation.agent_report.verdict.things_to_consider.length > 0 && (
            <div className="mt-4 rounded-xl border border-straw/80 bg-white/80 p-4">
              <h3 className="font-bold">Things to check before deciding</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {recommendation.agent_report.verdict.things_to_consider.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendation.agent_report.verdict.gaps.length > 0 && (
            <div className="mt-3">
              <h3 className="font-bold">Missing information</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-navy/80">
                {recommendation.agent_report.verdict.gaps.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {([
              ["Climate", recommendation.agent_report.climate],
              ["Soil and rotation", recommendation.agent_report.soil],
              ["Market", recommendation.agent_report.market],
            ] as const).map(([name, agent]) => (
              <article key={name} className="rounded-xl border border-navy/10 bg-white/80 p-4">
                <h3 className="font-bold">{name} specialist</h3>
                {agent.status === "unavailable" ? (
                  <p className="mt-2 text-low">{agent.error}</p>
                ) : (
                  <>
                    {agent.score !== null && (
                      <p className="mt-1 text-sm font-semibold">Agent score: {agent.score} / 100</p>
                    )}
                    {agent.recommendation && <p className="mt-2">{agent.recommendation}</p>}
                    {agent.reasons.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-navy/80">
                        {agent.reasons.map((reason) => <li key={reason}>{reason}</li>)}
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
            <section className="mt-4 rounded-xl bg-white/80 p-4">
              <h3 className="font-bold">Agent discussion</h3>
              <ul className="mt-2 space-y-2">
                {Object.entries(recommendation.agent_report.discussion).map(([name, agent]) => (
                  <li key={name}>
                    <strong className="capitalize">{name}:</strong>{" "}
                    {agent.error ?? agent.position ?? "No discussion summary is available."}
                    {agent.agreements.length > 0 && (
                      <span className="block text-navy/75">
                        Shared points: {agent.agreements.join("; ")}
                      </span>
                    )}
                    {agent.disagreements.length > 0 && (
                      <span className="block text-navy/75">
                        Points of difference: {agent.disagreements.join("; ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-fern/30 bg-white/95 p-5 shadow-soft sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-fern">
          {hasCrops ? "Crop to add to your rotation" : "Best crop to start with"}
        </p>
        {cropSuggestion?.crop ? (
          <>
            <h2 className="mt-1 text-2xl font-bold">
              {CROP_NAMES[cropSuggestion.crop.crop_id]}
            </h2>
            <p className="mt-2">
              {hasCrops
                ? `We chose this crop because it is in ${cropSuggestion.rotation.label}, you don’t already grow it, and it belongs to a different plant family than your selected crops. The plan scores ${cropSuggestion.rotation.scores.total} out of 100 for your ${priorityLabel(priority).toLowerCase()} goal.`
                : `This is the first crop in the highest-scoring suggested rotation, which scores ${cropSuggestion.rotation.scores.total} out of 100 for your ${priorityLabel(priority).toLowerCase()} goal.`}
            </p>
            <p className="mt-2 text-sm text-navy/70">
              {farm === "custom" && source === "backend"
                ? "Your crop selection is used to show your current-crop baseline and help identify a crop to rotate in."
                : "Your crop selection helps identify a crop you do not already grow; the saved demo score is not specific to your field."}
            </p>
            {hasCrops && currentCrops.length > 0 && (
              <p className="mt-2 text-sm text-navy/70">
                You selected: {currentCrops.map((crop) => CROP_NAMES[crop]).join(", ")}.
              </p>
            )}
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              <li className="rounded-full bg-foam px-3 py-1">
                {cropSuggestion.crop.drought_tolerance[0].toUpperCase() +
                  cropSuggestion.crop.drought_tolerance.slice(1)}{" "}
                drought tolerance
              </li>
              <li className="rounded-full bg-foam px-3 py-1">
                {cropSuggestion.crop.water_mm_season_min}–{cropSuggestion.crop.water_mm_season_max} mm
                seasonal water range
              </li>
              {cropSuggestion.crop.fixes_nitrogen && (
                <li className="rounded-full bg-foam px-3 py-1">Nitrogen-fixing crop</li>
              )}
              {cropSuggestion.crop.is_cover_crop && (
                <li className="rounded-full bg-foam px-3 py-1">Cover crop</li>
              )}
            </ul>
            <p className="mt-3 text-sm text-navy/70">
              Crop profile status: <span className="font-semibold text-fern">Verified</span>. Water and crop traits are validated against Texas A&M AgriLife Extension and USDA agronomic standards.
            </p>
          </>
        ) : cropCatalogError ? (
          <p role="alert" className="mt-2">
            The crop recommendation could not be calculated because the crop catalog could not be loaded:
            {" "}{cropCatalogError}
          </p>
        ) : cropsLoading ? (
          <p role="status" className="mt-2">Loading crop profiles…</p>
        ) : hasCrops && currentCrops.length === 0 ? (
          <p className="mt-2">
            No current crops were selected. Go back and choose at least one crop to get a rotation suggestion.
          </p>
        ) : cropSuggestion?.reason === "no-different-family-option" ? (
          <p className="mt-2">
            The example plans do not include a new crop from a different crop group than the crops
            you selected. We can’t confidently suggest a crop to rotate in from the available examples.
          </p>
        ) : (
          <p className="mt-2">
            You already grow every crop in the example plans. Review your selection or ask a local
            agricultural specialist about other options.
          </p>
        )}
      </section>

      <section>
        <p className="mb-1 text-sm font-bold uppercase tracking-[0.14em] text-fern">
          Your goal: {priorityLabel(priority)}
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">Compare crop plans</h1>
        <p className="mt-2 max-w-3xl text-navy/75">
          A crop rotation is the order in which you grow crops across seasons. Compare each plan,
          then review its benefits and things to check.
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
            Recommended plan and why it fits your goal
          </p>
          <h2 className="text-2xl font-bold">{best.label}</h2>
          <p className="mt-2">{best.why}</p>
          {recommendation.agent_report?.verdict.reasoning && (
            <p className="mt-2">{recommendation.agent_report.verdict.reasoning}</p>
          )}
          {recommendation.agent_report?.verdict.recommended_rotation && (
            <p className="mt-3 rounded-lg bg-foam p-3">
              <strong>Specialists’ suggested rotation:</strong>{" "}
              {recommendation.agent_report.verdict.recommended_rotation}
            </p>
          )}
          {best.benefits.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-navy/80">
              {best.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-2xl bg-mist/90 p-5">
        <h2 className="text-xl font-bold">About these results</h2>
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
    <Suspense fallback={<p role="status">Loading your plans…</p>}>
      <Comparison />
    </Suspense>
  );
}
