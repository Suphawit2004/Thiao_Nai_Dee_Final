"use client";

import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { mapsUrl, type Cafe } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import { PIN_COLORS } from "@/lib/thumbs";
import { DEFAULT_CENTER } from "@/lib/map";
import CafeThumb from "../CafeThumb";

const iconCache = new Map<string, L.DivIcon>();

function makeIcon(color: string): L.DivIcon {
  let icon = iconCache.get(color);
  if (!icon) {
    icon = L.divIcon({
      className: "coffee-marker",
      html: `<div class="pin-wrap" style="--pin:${color}"><div class="pin-head"><span>☕</span></div><div class="pin-tail"></div></div>`,
      iconSize: [32, 44],
      iconAnchor: [16, 44],
      popupAnchor: [0, -42],
    });
    iconCache.set(color, icon);
  }
  return icon;
}

function FitBounds({ cafes }: { cafes: Cafe[] }) {
  const map = useMap();
  // Key the effect on a primitive signature: callers may pass a fresh array
  // literal every render (e.g. DetailView), and re-fitting on each of those
  // would reset pan/zoom the user has applied.
  const fitKey = useMemo(
    () => cafes.map((c) => `${c.slug}:${c.lat},${c.lng}`).join("|"),
    [cafes]
  );
  useEffect(() => {
    if (cafes.length === 1) {
      map.setView([cafes[0].lat, cafes[0].lng], 16);
    } else if (cafes.length > 1) {
      map.fitBounds(
        L.latLngBounds(cafes.map((c) => [c.lat, c.lng] as [number, number])),
        { paddingTopLeft: [40, 96], paddingBottomRight: [24, 24] }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit only when the set of cafes actually changes
  }, [map, fitKey]);
  return null;
}

interface MapViewProps {
  cafes: Cafe[];
  className?: string;
}

export default function MapView({ cafes, className }: MapViewProps) {
  const { t, tr } = useLang();
  const center: [number, number] =
    cafes.length > 0 ? [cafes[0].lat, cafes[0].lng] : DEFAULT_CENTER;

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
          icon={makeIcon(PIN_COLORS[i % PIN_COLORS.length])}
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
              <p className="mt-0.5 text-xs text-espresso/70">{tr(cafe.address)}</p>
              <div className="mt-2 flex gap-2 text-xs font-semibold">
                <Link href={`/cafes/${cafe.slug}`} className="text-[#7c5a43] underline-offset-2 hover:underline">
                  {t("detail.viewCafe")} →
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
