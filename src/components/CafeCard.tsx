"use client";

import Link from "next/link";
import type { Cafe } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import RatingStars from "./RatingStars";
import OpenBadge from "./OpenBadge";
import TagChip from "./TagChip";

const THUMBS: Array<[string, string]> = [
  ["#7c5a43", "#b98a5e"],
  ["#5c7457", "#93a97b"],
  ["#a06a3f", "#d9b382"],
  ["#6b4f6e", "#b48ead"],
  ["#3f6c72", "#83b0b5"],
  ["#8a5a44", "#c98d63"],
];

function thumbFor(slug: string): [string, string] {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return THUMBS[hash % THUMBS.length];
}

export default function CafeCard({ cafe }: { cafe: Cafe }) {
  const { tr } = useLang();
  const [from, to] = thumbFor(cafe.slug);

  return (
    <Link
      href={`/cafes/${cafe.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#eee3d2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className="relative flex h-40 items-center justify-center"
        style={{
          background: `radial-gradient(circle at 22% 28%, rgb(255 255 255 / 0.18), transparent 42%), linear-gradient(135deg, ${from}, ${to})`,
        }}
      >
        <span className="text-5xl drop-shadow-lg transition group-hover:scale-110" aria-hidden>
          ☕
        </span>
        <span className="absolute bottom-2 left-3 text-sm font-bold text-white/90 drop-shadow">
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

        <OpenBadge cafe={cafe} />

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
