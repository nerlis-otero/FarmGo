"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Standard Leaflet marker.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

type Props = {
  position: [number, number] | null;
  onSelect: (lat: number, lon: number) => void;
};

function ClickHandler({ onSelect }: Pick<Props, "onSelect">) {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 8), { duration: 0.6 });
  }, [position, map]);
  return null;
}

export default function FarmMap({ position, onSelect }: Props) {
  // Next 16 hides and shows pages without unmounting them, and Leaflet does not
  // support reusing its container. Create the map only while the page is visible
  // and destroy it when the page is hidden.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => {
      window.cancelAnimationFrame(frame);
      setVisible(false);
    };
  }, []);

  if (!visible) {
    return <div className="h-72 w-full rounded-xl bg-mist md:h-96" />;
  }

  return (
    <MapContainer
      center={[31.5, -99.5]}
      zoom={6}
      className="h-48 w-full rounded-xl border border-navy/20 sm:h-52"
      aria-label="Map of Texas. Click to mark your farm location."
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <ClickHandler onSelect={onSelect} />
      <Recenter position={position} />
      {position && <Marker position={position} icon={markerIcon} />}
    </MapContainer>
  );
}
