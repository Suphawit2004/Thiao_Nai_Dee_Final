"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { mapsUrl, type Cafe } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import CafeThumb from "../CafeThumb";

const COLORS = ["#7c5a43", "#5c7457", "#a06a3f", "#3f6c72", "#8a5a44", "#6b4f6e"];

function makeIcon(color: string) {
  return L.divIcon({
    className: "coffee-marker",
    html: `<div class="pin-wrap" style="--pin:${color}"><div class="pin-head"><span>☕</span></div><div class="pin-tail"></div></div>`,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -42],
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
        { paddingTopLeft: [40, 96], paddingBottomRight: [24, 24] }
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
            <div className="w-52">
              <div className="relative mb-2 h-24 overflow-hidden rounded-lg">
                <CafeThumb cafe={cafe} emojiClassName="text-3xl drop-shadow" sizes="208px" />
                <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-espresso">
                  {"฿".repeat(cafe.priceRange)}
                </span>
                <span className="absolute bottom-1 left-2 text-[11px] font-bold text-white/95 drop-shadow">
                  {tr(cafe.name)}
                </span>
              </div>
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
