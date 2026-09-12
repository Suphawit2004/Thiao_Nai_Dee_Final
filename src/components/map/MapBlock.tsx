"use client";

import dynamic from "next/dynamic";
import type { Cafe } from "@/data/cafes";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center rounded-xl bg-sand text-sm font-medium text-espresso/70">
      ⏳ Loading map…
    </div>
  ),
});

interface MapBlockProps {
  cafes: Cafe[];
  className?: string;
  selectedSlug?: string | null;
  onSelect?: (slug: string) => void;
}

export default function MapBlock({ cafes, className, selectedSlug, onSelect }: MapBlockProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-[#eee3d2] shadow-sm ${className ?? ""}`}>
      <MapView selectedSlug={selectedSlug} onSelect={onSelect} cafes={cafes} className="h-full w-full" />
    </div>
  );
}
