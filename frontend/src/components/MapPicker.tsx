"use client";

// frontend/src/components/MapPicker.tsx
// Requiere:  npm i leaflet && npm i -D @types/leaflet
//
// Uso (en un componente cliente):
//   import dynamic from "next/dynamic";
//   const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });
//   <MapPicker value={coords} onChange={setCoords} />

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Circle } from "leaflet";
import "leaflet/dist/leaflet.css";

export type Coords = { lat: number; lng: number; accuracy?: number };

type Props = {
  value: Coords | null;
  onChange: (coords: Coords) => void;
  height?: number;
  showLocateButton?: boolean; // false si tu página ya tiene su propio botón "Use my location"
  showStatus?: boolean; // false si tu página ya muestra "Your location is not saved"
};

const DEFAULT_CENTER: [number, number] = [31.5, -99.5]; // Texas
const DEFAULT_ZOOM = 6;
const MARKER_COLOR = "#447027";
const round = (n: number) => Math.round(n * 1e5) / 1e5; // ~1 m de precisión

export default function MapPicker({
  value,
  onChange,
  height = 420,
  showLocateButton = true,
  showStatus = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onChangeRef = useRef(onChange);

  const [status, setStatus] = useState<string>("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Coloca/mueve el marcador y el círculo de precisión
  const placeMarker = useCallback((c: Coords, fly = false) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const latlng: [number, number] = [c.lat, c.lng];

    if (!markerRef.current) {
      // divIcon: evita el bug clásico de Next.js donde no cargan las imágenes del pin por defecto
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${MARKER_COLOR};border:3px solid #feffef;box-shadow:0 2px 6px rgba(36,61,23,.4);transform:rotate(-45deg)"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      const marker = L.marker(latlng, { icon, draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        circleRef.current?.remove();
        circleRef.current = null;
        onChangeRef.current({ lat: round(p.lat), lng: round(p.lng) });
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(latlng);
    }

    circleRef.current?.remove();
    circleRef.current = null;
    if (c.accuracy && c.accuracy > 0) {
      circleRef.current = L.circle(latlng, {
        radius: c.accuracy,
        color: MARKER_COLOR,
        weight: 1,
        fillOpacity: 0.12,
      }).addTo(map);
    }

    if (fly) map.flyTo(latlng, Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, []);

  // Crear el mapa una sola vez
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default ?? (await import("leaflet"));
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L as typeof import("leaflet");

      const map = L.map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        scrollWheelZoom: true,
      });

      // OSM bloquea sus tiles (403) y CARTO ahora exige API key (marca de agua "API KEY REQUIRED").
      // Esri World Street Map y World Imagery funcionan sin key.
      const calles = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles &copy; Esri, HERE, Garmin, OpenStreetMap contributors" }
      );
      const satelite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics" }
      );
      calles.addTo(map);
      L.control.layers({ Map: calles, Satellite: satelite }, undefined, { position: "topright" }).addTo(map);

      map.on("click", (e) => {
        const c = { lat: round(e.latlng.lat), lng: round(e.latlng.lng) };
        placeMarker(c);
        onChangeRef.current(c);
      });

      mapRef.current = map;

      // El contenedor puede tener tamaño 0 al montarse (pasos/tabs): recalcular
      setTimeout(() => map.invalidateSize(), 100);
      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(containerRef.current);
      (map as unknown as { _ro: ResizeObserver })._ro = ro;

      if (value) placeMarker(value, true);
    })();

    return () => {
      cancelled = true;
      const map = mapRef.current;
      if (map) {
        (map as unknown as { _ro?: ResizeObserver })._ro?.disconnect();
        map.remove();
      }
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el padre cambia el valor (p. ej. al volver al paso 1), reflejarlo en el mapa
  useEffect(() => {
    if (!value) return;
    const cur = markerRef.current?.getLatLng();
    const changedFromOutside = !cur || cur.lat !== value.lat || cur.lng !== value.lng;
    placeMarker(value, changedFromOutside);
  }, [value, placeMarker]);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setStatus("Your browser can't share location. Tap the map to mark your farm.");
      return;
    }
    setLocating(true);
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: Coords = {
          lat: round(pos.coords.latitude),
          lng: round(pos.coords.longitude),
          accuracy: Math.round(pos.coords.accuracy),
        };
        placeMarker(c, true);
        onChange(c);
        setLocating(false);
        setStatus(
          c.accuracy! > 100
            ? `Approximate location (±${c.accuracy} m). Drag the pin to your exact field.`
            : `Location found (±${c.accuracy} m). Drag the pin if you need to adjust it.`
        );
      },
      (err) => {
        setLocating(false);
        setStatus(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is blocked. Allow it in the browser, or tap the map to mark your farm."
            : err.code === err.TIMEOUT
            ? "Finding your location took too long. Try again or tap the map."
            : "We couldn't get your location. Tap the map to mark your farm."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div>
      {showLocateButton && (
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          style={{ marginBottom: 12 }}
        >
          {locating ? "Locating…" : "Use my location"}
        </button>
      )}

      <div
        ref={containerRef}
        style={{ height, width: "100%", borderRadius: 18, overflow: "hidden", zIndex: 0, border: "3px solid #feffef", boxShadow: "0 12px 30px rgba(68,112,39,.18)" }}
        aria-label="Map to mark your farm location"
      />

      {showStatus && (
        <p aria-live="polite" style={{ marginTop: 8 }}>
          {value
            ? `Marked: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}. ${status}`
            : status || "Your location is not saved."}
        </p>
      )}
    </div>
  );
}
