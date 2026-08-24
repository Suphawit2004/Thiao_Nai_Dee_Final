"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const DEFAULT_CENTER: [number, number] = [19.1668, 99.8928];

const pinIcon = L.divIcon({
  className: "coffee-marker",
  html: `<div class="pin-wrap" style="--pin:#3f6c72"><div class="pin-head"><span>📍</span></div><div class="pin-tail"></div></div>`,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
});

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ value }: { value: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.setView(value, Math.max(map.getZoom(), 16));
  }, [map, value]);
  return null;
}

interface MapPickerProps {
  value: [number, number] | null;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

export default function MapPicker({ value, onChange, className }: MapPickerProps) {
  const round = (n: number) => Number(n.toFixed(6));

  return (
    <MapContainer
      center={value ?? DEFAULT_CENTER}
      zoom={14}
      scrollWheelZoom
      className={`z-0 ${className ?? ""}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCapture onPick={(lat, lng) => onChange(round(lat), round(lng))} />
      <Recenter value={value} />
      {value && (
        <Marker
          position={value}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              onChange(round(ll.lat), round(ll.lng));
            },
          }}
        />
      )}
    </MapContainer>
  );
}