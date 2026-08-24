"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { mapsUrl, type Cafe } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";

const COLORS = ["#7c5a43", "#5c7457", "#a06a3f", "#3f6c72", "#8a5a44", "#6b4f6e"];

function makeIcon(color: string) {
  return L.divIcon({
    className: "coffee-marker",
    html: `<div class="marker-pin" style="--pin:${color}"><span>☕</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -30],
  });
}

function FitBounds({ cafes }: { cafes: Cafe[] }) {
  const map = useMap();
  useEffect(() => {
    if (cafes.length === 1) {
      map.setView([cafes[0].lat, cafes[0].lng], 16);
    } else if (cafes.length > 1) {
      map.fitBounds(
        L.latLngBounds(cafes.map((c) => [c.lat, c.lng] as [number, number])),
        { padding: [40, 40] }
      );
    }
  }, [map, cafes]);
  return null;
}

interface MapViewProps {
  cafes: Cafe[];
  className?: string;
}

export default function MapView({ cafes, className }: MapViewProps) {
  const { t, tr } = useLang();
  const center: [number, number] =
    cafes.length > 0 ? [cafes[0].lat, cafes[0].lng] : [19.1668, 99.8928];

  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom
      className={`z-0 ${className ?? ""}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds cafes={cafes} />
      {cafes.map((cafe, i) => (
        <Marker
          key={cafe.slug}
          position={[cafe.lat, cafe.lng]}
          icon={makeIcon(COLORS[i % COLORS.length])}
        >
          <Popup>
            <div className="min-w-44">
              <p className="text-sm font-bold text-espresso">{tr(cafe.name)}</p>
              <p className="mt-0.5 text-xs text-espresso/60">{tr(cafe.address)}</p>
              <div className="mt-2 flex gap-2 text-xs font-semibold">
                <Link href={`/cafes/${cafe.slug}`} className="text-[#7c5a43] underline-offset-2 hover:underline">
                  {t("nav.cafes")} →
                </Link>
                <a
                  href={mapsUrl(cafe)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline-offset-2 hover:underline"
                >
                  📍 Google Maps
                </a>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
