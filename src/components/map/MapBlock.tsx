"use client";

import dynamic from "next/dynamic";
import type { Cafe } from "@/data/cafes";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center rounded-xl bg-sand text-sm font-medium text-espresso/50">
      ⏳ Loading map…
    </div>
  ),
});

interface MapBlockProps {
  cafes: Cafe[];
  className?: string;
}

export default function MapBlock({ cafes, className }: MapBlockProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-[#eee3d2] shadow-sm ${className ?? ""}`}>
      <MapView cafes={cafes} className="h-full w-full" />
    </div>
  );
}
