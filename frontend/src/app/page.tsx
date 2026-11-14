"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BluebyStage from "@/components/BluebyStage";
import MapPicker from "@/components/MapPicker";
import { FARMS } from "@/data/farms";
import { PRIORITIES } from "@/data/labels";
import { isInsideTexas } from "@/lib/texas";
import type { Priority } from "@/types/recommendation";

type Step = "location" | "priority";
type Selected = { farmId: string; lat: number; lon: number } | null;

function HomeContent() {
  const router = useRouter();
  // Team demo mode: open the page with ?demo=1 to see sample farms.
  const demo = useSearchParams().get("demo") === "1";

  const [step, setStep] = useState<Step>("location");
  const [selected, setSelected] = useState<Selected>(null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const outsideTexas = selected ? !isInsideTexas(selected.lat, selected.lon) : false;

  // What Blueby says at each step.
  const text =
    step === "location"
      ? selected
        ? outsideTexas
          ? "I marked your location, but for now I only have detailed data for Texas."
          : "Done! I marked your farm. Click “Next.”"
        : "Hi! I’m Blueby, and I’ll help you choose what to grow. First, tell me where your farm is."
      : priority
        ? "Great! I’m finding your 3 best options."
        : "What matters most to you this season?";

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Your browser doesn’t allow location access. Click the map to mark your farm.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelected({ farmId: "custom", lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoError("We couldn’t get your location. Click the map to mark your farm.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function goToComparison() {
    if (!selected || !priority) return;
    const q = new URLSearchParams({
      farm: selected.farmId,
      lat: String(selected.lat),
      lon: String(selected.lon),
      priority,
    });
    router.push(`/comparar?${q.toString()}`);
  }

  return (
    <BluebyStage text={text}>
      {step === "location" ? (
        <div className="flex flex-col gap-4 rounded-xl border border-navy/20 bg-white p-5">
          <h1 className="text-2xl font-bold">1. Where is your farm?</h1>

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="w-fit rounded-lg border-2 border-indigo px-6 py-3 font-bold text-indigo hover:bg-mist disabled:opacity-40"
            >
              {locating ? "Finding your location…" : "Use my location"}
            </button>
            <p className="text-base text-navy/80">
              We only use it to find data for your area.
            </p>
            {geoError && <p className="font-bold text-low">{geoError}</p>}
          </div>

          <p>Or click the map to mark your farm:</p>
          <MapPicker
            position={selected ? [selected.lat, selected.lon] : null}
            onSelect={(lat, lon) => setSelected({ farmId: "custom", lat, lon })}
          />

          {selected && <p className="font-bold text-fern">✓ Your farm is marked.</p>}
          {outsideTexas && (
            <p className="rounded-lg bg-straw px-4 py-3 font-bold">
              This version is designed for Texas. Results may not be reliable outside the state.
            </p>
          )}

          {demo && (
            <div className="flex flex-col gap-2 rounded-lg bg-mist p-4">
              <p className="font-bold">Demo mode: sample farms</p>
              <div className="flex flex-wrap gap-3">
                {FARMS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelected({ farmId: f.id, lat: f.lat, lon: f.lon })}
                    className="rounded-lg border-2 border-navy bg-white px-4 py-2 font-bold"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!selected}
            onClick={() => setStep("priority")}
            className="w-fit rounded-lg bg-indigo px-8 py-3 text-lg font-bold text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : (
        <fieldset className="flex flex-col gap-4 rounded-xl border border-navy/20 bg-white p-5">
          <legend className="px-2 text-2xl font-bold">2. Choose what matters most to you</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRIORITIES.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${
                  priority === p.id ? "border-indigo bg-mist" : "border-navy/20"
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={p.id}
                  checked={priority === p.id}
                  onChange={() => setPriority(p.id)}
                  className="mt-1 h-6 w-6 accent-indigo"
                />
                <span>
                  <span className="block font-bold">{p.label}</span>
                  <span className="text-base text-navy/80">{p.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep("location")}
              className="rounded-lg border-2 border-navy px-6 py-3 font-bold hover:bg-mist"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!priority}
              onClick={goToComparison}
              className="rounded-lg bg-indigo px-8 py-3 text-lg font-bold text-white disabled:opacity-40"
            >
              See my 3 options
            </button>
          </div>
        </fieldset>
      )}
    </BluebyStage>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <HomeContent />
    </Suspense>
  );
}
