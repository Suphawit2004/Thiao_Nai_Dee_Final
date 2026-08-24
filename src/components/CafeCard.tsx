"use client";

import Link from "next/link";
import type { Cafe } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import CafeThumb from "./CafeThumb";
import AreaChip from "./AreaChip";
import RatingStars from "./RatingStars";
import OpenBadge from "./OpenBadge";
import TagChip from "./TagChip";

export default function CafeCard({ cafe }: { cafe: Cafe }) {
  const { tr } = useLang();

  return (
    <Link
      href={`/cafes/${cafe.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#eee3d2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative flex h-40 items-center justify-center overflow-hidden">
        <CafeThumb
          cafe={cafe}
          emojiClassName="text-5xl drop-shadow-lg transition group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <span className="pointer-events-none absolute bottom-2 left-3 text-sm font-bold text-white/90 drop-shadow">
          {tr(cafe.name)}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2 py-0.5 text-xs font-bold text-espresso">
          {"฿".repeat(cafe.priceRange)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-espresso group-hover:text-coffee">{tr(cafe.name)}</h3>
          <span className="flex items-center gap-1 text-xs font-semibold text-coffee">
            <RatingStars value={cafe.baseRating} />
            {cafe.baseRating.toFixed(1)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <OpenBadge cafe={cafe} />
          <AreaChip area={cafe.area} />
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-espresso/70">{tr(cafe.description)}</p>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {cafe.tags.slice(0, 3).map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>
      </div>
    </Link>
  );
}
