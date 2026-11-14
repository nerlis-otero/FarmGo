"use client";

import dynamic from "next/dynamic";

// Leaflet necesita el navegador: se carga sin renderizado en servidor.
const MapPicker = dynamic(() => import("./FarmMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-xl bg-mist md:h-96">
      Loading map…
    </div>
  ),
});

export default MapPicker;
