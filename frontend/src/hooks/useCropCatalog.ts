"use client";

import { useCallback, useEffect, useState } from "react";
import type { CropOption } from "@/types/crops";

type State = {
  crops: CropOption[];
  error: string | null;
  loading: boolean;
};

export function useCropCatalog() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({
    crops: [],
    error: null,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadCrops() {
      try {
        const response = await fetch("/api/crops", { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`The crop catalog returned an error (${response.status}).`);
        }
        const crops = (await response.json()) as CropOption[];
        setState({ crops, error: null, loading: false });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          crops: [],
          error:
            error instanceof Error
              ? error.message
              : "The crop catalog could not be loaded.",
          loading: false,
        });
      }
    }

    void loadCrops();
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...state, retry };
}
