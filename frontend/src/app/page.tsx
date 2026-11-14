"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BluebyStage from "@/components/BluebyStage";
import MapPicker from "@/components/MapPicker";
import { PRIORITIES } from "@/data/labels";
import { isInsideTexas } from "@/lib/texas";
import type { Priority } from "@/types/recommendation";

type Step = "location" | "priority";
type Selected = { farmId: string; lat: number; lon: number } | null;

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("location");
  const [selected, setSelected] = useState<Selected>(null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const outsideTexas = selected ? !isInsideTexas(selected.lat, selected.lon) : false;
  const bluebyText =
    step === "priority"
      ? "Pick what matters most to your farm this season. I’ll sort the example options around that goal."
      : selected
        ? outsideTexas
          ? "Your location is marked. This preview is designed for Texas, so results elsewhere are only examples."
          : "Your farm is marked. Next, choose what matters most this season."
        : "Hi, I’m Blueby! Mark your farm on the map or use your current location. Then choose a goal to see a sample crop plan.";

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
    if (!selected || !priority) return;
    const query = new URLSearchParams({
      farm: selected.farmId,
      lat: String(selected.lat),
      lon: String(selected.lon),
      priority,
    });
    router.push(`/comparar?${query.toString()}`);
  }

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
            aria-current={step === "priority" ? "step" : undefined}
            className={`rounded-full px-3 py-1.5 font-bold ${
              step === "priority" ? "bg-indigo text-white" : "bg-mist text-navy/70"
            }`}
          >
            2 · Your goal
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
              position={selected ? [selected.lat, selected.lon] : null}
              onSelect={(lat, lon) => {
                setSelected({ farmId: "custom", lat, lon });
                setLocationError(null);
              }}
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
                onClick={() => setStep("priority")}
                className="min-h-10 rounded-lg bg-indigo px-6 py-1.5 font-bold text-white shadow-sm transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </div>
            {outsideTexas && (
              <p className="rounded-lg bg-straw px-3 py-2 text-sm font-semibold">
                This preview is designed for Texas. Results outside the state are only examples.
              </p>
            )}
          </>
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
                onClick={() => setStep("location")}
                className="min-h-12 rounded-lg border-2 border-navy/25 px-5 py-2 font-bold hover:bg-mist"
              >
                Back to farm
              </button>
              <button
                type="button"
                disabled={!priority}
                onClick={goToComparison}
                className="min-h-12 rounded-lg bg-indigo px-7 py-2 font-bold text-white shadow-sm transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-40"
              >
                Show my sample plan
              </button>
            </div>
          </fieldset>
        )}
      </div>
    </BluebyStage>
  );
}
