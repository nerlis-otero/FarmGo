"use client";

import { useEffect, useState } from "react";
import {
  CROP_IDS,
  type CropId,
  type Priority,
  type RecommendRequest,
  type RecommendResponse,
} from "@/types/contracts";

type State = {
  requestKey: string;
  recommendation: RecommendResponse | null;
  source: "backend" | "saved-demo" | null;
  error: string | null;
  loading: boolean;
};

export function useRecommendation(
  farmId: string,
  priority: Priority,
  lat: number | null,
  lon: number | null,
  currentCrops: CropId[] = [],
) {
  const [attempt, setAttempt] = useState(0);
  const currentCropsKey = currentCrops.join(",");
  const requestKey = JSON.stringify([farmId, priority, lat, lon, currentCropsKey, attempt]);
  const invalidLocation =
    farmId === "custom" &&
    (lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon));
  const [state, setState] = useState<State>({
    requestKey: "",
    recommendation: null,
    source: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    if (invalidLocation) return () => controller.abort();

    async function loadRecommendation() {
      let request: RecommendRequest;
      const selectedCropIds = currentCropsKey
        .split(",")
        .filter((crop): crop is CropId => CROP_IDS.includes(crop as CropId));
      if (farmId === "custom") {
        if (lat === null || lon === null) return;
        request = { lat, lon, priority, current_crops: selectedCropIds };
      } else {
        request = { farm_id: farmId || "farm_1", priority, current_crops: selectedCropIds };
      }

      try {
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        if (!response.ok) {
          setState({
            requestKey,
            recommendation: null,
            source: null,
            error: `The recommendation service returned an error (${response.status}).`,
            loading: false,
          });
          return;
        }
        const recommendation = (await response.json()) as RecommendResponse;
        const source =
          response.headers.get("x-farmgo-data-source") ??
          response.headers.get("x-farmfuture-data-source");
        setState({
          requestKey,
          recommendation,
          source: source === "saved-demo" ? "saved-demo" : "backend",
          error: null,
          loading: false,
        });
      } catch {
        if (controller.signal.aborted) return;
        setState({
          requestKey,
          recommendation: null,
          source: null,
          error: "We couldn't load the crop plans. Check the service and try again.",
          loading: false,
        });
      }
    }

    void loadRecommendation();
    return () => controller.abort();
  }, [farmId, priority, lat, lon, currentCropsKey, invalidLocation, requestKey]);

  const hasCurrentResult = state.requestKey === requestKey;
  return {
    recommendation: hasCurrentResult ? state.recommendation : null,
    source: hasCurrentResult ? state.source : null,
    error: invalidLocation
      ? "The farm location is missing. Return to the map and mark it again."
      : hasCurrentResult
        ? state.error
        : null,
    loading: !invalidLocation && (!hasCurrentResult || state.loading),
    retry: () => setAttempt((value) => value + 1),
  };
}
