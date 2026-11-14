"use client";

import dynamic from "next/dynamic";

// Leaflet requires a browser, so it is loaded without server-side rendering.
const MapPicker = dynamic(() => import("./FarmMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 w-full items-center justify-center rounded-xl bg-mist sm:h-52">
      Loading map…
    </div>
  ),
});

export default MapPicker;
