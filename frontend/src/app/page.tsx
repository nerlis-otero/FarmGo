"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BluebyStage from "@/components/BluebyStage";
import MapPicker from "@/components/MapPicker";
import { CROP_NAMES, PRIORITIES } from "@/data/labels";
import { useCropCatalog } from "@/hooks/useCropCatalog";
import { isInsideTexas } from "@/lib/texas";
import type { CropId, Priority } from "@/types/contracts";

type Step = "location" | "crops" | "priority";
type Selected = { farmId: string; lat: number; lon: number } | null;

export default function Home() {
  const router = useRouter();
  const { crops, error: cropError, loading: cropsLoading, retry: retryCrops } = useCropCatalog();
  const [step, setStep] = useState<Step>("location");
  const [selected, setSelected] = useState<Selected>(null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [hasCrops, setHasCrops] = useState<boolean | null>(null);
  const [currentCrops, setCurrentCrops] = useState<CropId[]>([]);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const outsideTexas = selected ? !isInsideTexas(selected.lat, selected.lon) : false;
  const bluebyText =
    step === "priority"
      ? "Choose what matters most to your farm this season. I’ll sort the example plans around that goal."
      : step === "crops"
        ? hasCrops === true
          ? "Select every crop you currently grow. I’ll look for a crop to add from the highest-scoring example rotation."
          : hasCrops === false
            ? "Since you don’t grow crops yet, I’ll suggest a crop to start with from the example plans."
            : "Do you currently grow any of these crops? Tell me whether you have crops, then choose them from the catalog."
      : selected
        ? outsideTexas
          ? "Your location is marked. This preview is designed for Texas, so results elsewhere are only examples."
          : "Your farm is marked. Next, choose what matters most this season."
        : "Hi, I’m Blueby! Mark your farm on the map or use your current location. Then choose a goal to compare sample crop plans.";

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location access isn’t available in this browser. Click the map to mark your farm.");
      return;
    }

    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelected({
          farmId: "custom",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setLocationError("We couldn’t get your location. Click the map to mark your farm instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function goToComparison() {
    if (!selected || !priority || hasCrops === null || (hasCrops && currentCrops.length === 0)) return;
    const query = new URLSearchParams({
      farm: selected.farmId,
      lat: String(selected.lat),
      lon: String(selected.lon),
      priority,
      hasCrops: hasCrops ? "yes" : "no",
    });
    if (hasCrops) query.set("currentCrops", currentCrops.join(","));
    router.push(`/comparar?${query.toString()}`);
  }

  const canContinueFromCrops =
    hasCrops !== null &&
    (!hasCrops || currentCrops.length > 0) &&
    !cropsLoading &&
    !cropError &&
    crops.length > 0;

  return (
    <BluebyStage text={bluebyText}>
      <div className="flex flex-col gap-4 rounded-2xl border border-navy/10 bg-white/95 p-4 shadow-soft sm:p-5">
        <ol aria-label="Setup progress" className="flex flex-wrap gap-2 text-sm">
          <li
            aria-current={step === "location" ? "step" : undefined}
            className={`rounded-full px-3 py-1.5 font-bold ${
              step === "location" ? "bg-indigo text-white" : "bg-mist text-navy/70"
            }`}
          >
            1 · Farm location
          </li>
          <li
            aria-current={step === "crops" ? "step" : undefined}
            className={`rounded-full px-3 py-1.5 font-bold ${
              step === "crops" ? "bg-indigo text-white" : "bg-mist text-navy/70"
            }`}
          >
            2 · Your current crops
          </li>
          <li
            aria-current={step === "priority" ? "step" : undefined}
            className={`rounded-full px-3 py-1.5 font-bold ${
              step === "priority" ? "bg-indigo text-white" : "bg-mist text-navy/70"
            }`}
          >
            3 · Your goal
          </li>
        </ol>

        {step === "location" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Mark your farm location</h1>
                <p className="text-base text-navy/70">Tap the map, or use your current location.</p>
              </div>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="min-h-10 rounded-lg border-2 border-indigo px-4 py-1.5 text-base font-bold text-indigo hover:bg-mist disabled:opacity-50"
              >
                {locating ? "Finding location…" : "Use my location"}
              </button>
            </div>

            {locationError && <p role="alert" className="text-base font-semibold text-low">{locationError}</p>}
            <MapPicker
              value={selected ? { lat: selected.lat, lng: selected.lon } : null}
              onChange={({ lat, lng }) => {
                setSelected({ farmId: "custom", lat, lon: lng });
                setLocationError(null);
              }}
              showLocateButton={false}
              showStatus={false}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              {selected ? (
                <p className="text-base font-semibold text-fern">
                  ✓ Farm location marked
                </p>
              ) : (
                <p className="text-base text-navy/70">
                  Your location is not saved.
                </p>
              )}
              <button
                type="button"
                disabled={!selected}
                onClick={() => setStep("crops")}
                className="min-h-10 rounded-lg bg-indigo px-6 py-1.5 font-bold text-white shadow-sm transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </div>
            <p className="text-sm text-navy/70">
              When you request a plan, your marked coordinates are sent to NASA POWER to retrieve
              historical climate data for that location.
            </p>
            {outsideTexas && (
              <p className="rounded-lg bg-straw px-3 py-2 text-sm font-semibold">
                This preview is designed for Texas. Results outside the state are only examples.
              </p>
            )}
          </>
        ) : step === "crops" ? (
          <div className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-3">
              <legend className="text-2xl font-bold sm:text-3xl">
                Do you currently grow any crops?
              </legend>
              <p className="text-base text-navy/75">
                Choose yes to select the crops you grow, or no if you are just getting started.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { value: true, label: "Yes, I grow crops" },
                  { value: false, label: "No, I don’t grow crops yet" },
                ].map((answer) => (
                  <label
                    key={String(answer.value)}
                    className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 p-4 ${
                      hasCrops === answer.value
                        ? "border-fern bg-foam"
                        : "border-navy/15 bg-white hover:border-fern"
                    }`}
                  >
                    <input
                      type="radio"
                      name="hasCrops"
                      checked={hasCrops === answer.value}
                      onChange={() => setHasCrops(answer.value)}
                      className="h-5 w-5 accent-indigo"
                    />
                    <span className="font-bold">{answer.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {hasCrops && (
              <fieldset className="flex flex-col gap-3">
                <legend className="text-xl font-bold">Select all crops you currently grow</legend>
                {cropsLoading ? (
                  <p role="status" className="text-navy/70">Loading crop options…</p>
                ) : cropError ? (
                  <div role="alert" className="rounded-lg bg-straw p-3">
                    <p>{cropError}</p>
                    <button
                      type="button"
                      onClick={retryCrops}
                      className="mt-2 font-bold text-indigo underline"
                    >
                      Try loading the crop list again
                    </button>
                  </div>
                ) : crops.length === 0 ? (
                  <p role="alert" className="rounded-lg bg-straw p-3">
                    No crop options are available. Check the crop catalog and try again.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {crops.map((crop) => (
                      <label
                        key={crop.crop_id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                          currentCrops.includes(crop.crop_id)
                            ? "border-fern bg-foam"
                            : "border-navy/15 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={currentCrops.includes(crop.crop_id)}
                          onChange={(event) => {
                            setCurrentCrops((selectedCrops) =>
                              event.target.checked
                                ? [...selectedCrops, crop.crop_id]
                                : selectedCrops.filter((id) => id !== crop.crop_id),
                            );
                          }}
                          className="h-5 w-5 accent-indigo"
                        />
                        <span className="font-semibold">{CROP_NAMES[crop.crop_id]}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-sm text-navy/70">
                  These crops come from the farm crop catalog. The catalog’s growing profiles are
                  preliminary and have not yet been verified.
                </p>
                {hasCrops && currentCrops.length === 0 && !cropsLoading && !cropError && (
                  <p className="text-sm font-semibold text-low">
                    Select at least one crop to continue.
                  </p>
                )}
              </fieldset>
            )}
            {cropError && !hasCrops && (
              <div role="alert" className="rounded-lg bg-straw p-3">
                <p>{cropError}</p>
                <button
                  type="button"
                  onClick={retryCrops}
                  className="mt-2 font-bold text-indigo underline"
                >
                  Try loading the crop list again
                </button>
              </div>
            )}
            {!cropsLoading && !cropError && crops.length === 0 && (
              <p role="alert" className="rounded-lg bg-straw p-3">
                No crop options are available. Check the crop catalog and try again.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep("location")}
                className="min-h-12 rounded-lg border-2 border-navy/25 px-5 py-2 font-bold hover:bg-mist"
              >
                Back to farm
              </button>
              <button
                type="button"
                disabled={!canContinueFromCrops}
                onClick={() => setStep("priority")}
                className="min-h-12 rounded-lg bg-indigo px-7 py-2 font-bold text-white shadow-sm transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <fieldset className="flex flex-col gap-3">
            <legend className="text-2xl font-bold sm:text-3xl">What matters most this season?</legend>
            <p className="text-base text-navy/75">Choose one goal. You can change it later.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRIORITIES.map((option) => (
                <label
                  key={option.id}
                  className={`flex min-h-24 cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
                    priority === option.id ? "border-fern bg-foam" : "border-navy/15 bg-white hover:border-fern"
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={option.id}
                    checked={priority === option.id}
                    onChange={() => setPriority(option.id)}
                    className="mt-1 h-5 w-5 accent-indigo"
                  />
                  <span>
                    <span className="block font-bold">{option.label}</span>
                    <span className="mt-1 block text-base text-navy/70">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep("crops")}
                className="min-h-12 rounded-lg border-2 border-navy/25 px-5 py-2 font-bold hover:bg-mist"
              >
                Back to crops
              </button>
              <button
                type="button"
                disabled={!priority}
                onClick={goToComparison}
                className="min-h-12 rounded-lg bg-indigo px-7 py-2 font-bold text-white shadow-sm transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-40"
              >
                Compare plans
              </button>
            </div>
          </fieldset>
        )}
      </div>
    </BluebyStage>
  );
}
