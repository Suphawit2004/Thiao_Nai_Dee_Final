"use client";

import Link from "next/link";
import { CAFES } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import CafeThumb from "./CafeThumb";
import RatingStars from "./RatingStars";
import MapBlock from "./map/MapBlock";

export default function MapViewPage() {
  const { t, tr } = useLang();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold text-espresso">🗺️ {t("map.title")}</h1>
        <p className="mt-1 text-espresso/70">{t("map.subtitle")}</p>
      </header>

      <MapBlock cafes={CAFES} className="mt-6 h-[62vh] min-h-[420px]" />
      <p className="mt-2 text-xs text-espresso/70">{t("map.hint")}</p>

      <div className="mt-8 flex gap-4 overflow-x-auto pb-3">
        {[...CAFES]
          .sort((a, b) => b.baseRating - a.baseRating)
          .map((cafe) => (
            <Link
              key={cafe.slug}
              href={`/cafes/${cafe.slug}`}
              className="min-w-56 shrink-0 overflow-hidden rounded-xl border border-[#eee3d2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className="relative flex h-20 items-center justify-center overflow-hidden"
                aria-hidden
              >
                <CafeThumb cafe={cafe} emojiClassName="text-3xl" sizes="224px" />
              </div>
              <div className="p-4">
                <p className="font-semibold text-espresso">{tr(cafe.name)}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-coffee">
                  <RatingStars value={cafe.baseRating} /> {cafe.baseRating.toFixed(1)}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-espresso/70">{tr(cafe.address)}</p>
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
