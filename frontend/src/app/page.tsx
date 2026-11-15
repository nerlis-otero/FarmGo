"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BluebyStage from "@/components/BluebyStage";
import MapPicker from "@/components/MapPicker";
import PriorityIcon from "@/components/PriorityIcon";
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
      ? "What matters most this season?"
      : step === "crops"
        ? hasCrops === true
          ? "Select the crops you grow now."
          : hasCrops === false
            ? "Got it — I’ll suggest a crop to start with."
            : "Do you already grow crops?"
      : selected
        ? outsideTexas
          ? "Marked. This preview is built for Texas."
          : "Farm marked. Next: your crops."
        : "Hi, I’m Blueby! Mark your farm on the map to get started.";

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location isn’t available here. Tap the map instead.");
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
        setLocationError("Couldn’t get location. Tap the map instead.");
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

  const steps: { id: Step; label: string }[] = [
    { id: "location", label: "Location" },
    { id: "crops", label: "Crops" },
    { id: "priority", label: "Goal" },
  ];

  const stepIndex = steps.findIndex((item) => item.id === step);

  return (
    <BluebyStage text={bluebyText} compact>
      <div className="flex flex-col gap-3 rounded-2xl border border-navy/10 bg-white/95 p-4 shadow-soft sm:p-5">
        <ol aria-label="Setup progress" className="flex flex-wrap gap-2 text-sm">
          {steps.map((item, index) => (
            <li
              key={item.id}
              aria-current={step === item.id ? "step" : undefined}
              className={`rounded-full px-3 py-1.5 font-bold transition-colors ${
                step === item.id
                  ? "bg-indigo text-white shadow-[0_0_0_4px_rgb(82_170_233/28%)]"
                  : index < stepIndex
                    ? "bg-straw text-navy"
                    : "bg-mist text-navy/70"
              }`}
            >
              {index + 1} · {item.label}
            </li>
          ))}
        </ol>

        {step === "location" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">Mark your farm</h1>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="min-h-10 rounded-lg border-2 border-indigo px-4 py-1.5 text-base font-bold text-indigo hover:bg-mist disabled:opacity-50"
              >
                {locating ? "Finding…" : "Use my location"}
              </button>
            </div>

            {locationError && (
              <p role="alert" className="text-sm font-semibold text-low">
                {locationError}
              </p>
            )}
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
                <p className="rounded-full bg-foam px-3 py-1 text-sm font-bold text-fern">
                  ✓ Marked
                </p>
              ) : (
                <p className="text-sm text-navy/75">Tap the map to mark your field</p>
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
            {outsideTexas && (
              <p className="rounded-lg bg-straw px-3 py-2 text-sm font-semibold">
                Built for Texas — results outside the state are examples only.
              </p>
            )}
          </>
        ) : step === "crops" ? (
          <div className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-3">
              <legend className="text-2xl font-bold sm:text-3xl">Your crops</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: true, label: "I grow crops" },
                  { value: false, label: "Starting fresh" },
                ].map((answer) => (
                  <label
                    key={String(answer.value)}
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 ${
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
                <legend className="text-lg font-bold">Select what you grow</legend>
                {cropsLoading ? (
                  <p role="status" className="text-navy/70">
                    Loading crops…
                  </p>
                ) : cropError ? (
                  <div role="alert" className="rounded-lg bg-straw p-3">
                    <p>{cropError}</p>
                    <button
                      type="button"
                      onClick={retryCrops}
                      className="mt-2 font-bold text-indigo underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : crops.length === 0 ? (
                  <p role="alert" className="rounded-lg bg-straw p-3">
                    No crop options available.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {crops.map((crop) => (
                      <label
                        key={crop.crop_id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${
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
                {hasCrops && currentCrops.length === 0 && !cropsLoading && !cropError && (
                  <p className="text-sm font-semibold text-low">Select at least one crop.</p>
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
                  Try again
                </button>
              </div>
            )}
            {!cropsLoading && !cropError && crops.length === 0 && (
              <p role="alert" className="rounded-lg bg-straw p-3">
                No crop options available.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep("location")}
                className="min-h-11 rounded-lg border-2 border-navy/25 px-5 py-2 font-bold hover:bg-mist"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!canContinueFromCrops}
                onClick={() => setStep("priority")}
                className="min-h-11 rounded-lg bg-indigo px-7 py-2 font-bold text-white shadow-sm transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <fieldset className="flex flex-col gap-3">
            <legend className="text-2xl font-bold sm:text-3xl">Your goal</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRIORITIES.map((option) => (
                <label
                  key={option.id}
                  className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition-colors ${
                    priority === option.id
                      ? "border-fern bg-foam"
                      : "border-navy/15 bg-white hover:border-fern"
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
                  <PriorityIcon id={option.id} />
                  <span>
                    <span className="block font-bold">{option.label}</span>
                    <span className="mt-0.5 block text-sm text-navy/75">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep("crops")}
                className="min-h-11 rounded-lg border-2 border-navy/25 px-5 py-2 font-bold hover:bg-mist"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!priority}
                onClick={goToComparison}
                className="min-h-11 rounded-lg bg-indigo px-7 py-2 font-bold text-white shadow-sm transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-40"
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
