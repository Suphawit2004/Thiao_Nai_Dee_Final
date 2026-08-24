"use client";

import Link from "next/link";
import type { Cafe } from "@/data/cafes";
import { mapsUrl } from "@/data/cafes";
import { DAY_KEYS } from "@/i18n/dictionaries";
import { useLang } from "@/i18n/LangProvider";
import CafeThumb from "./CafeThumb";
import OpenBadge from "./OpenBadge";
import RatingStars from "./RatingStars";
import TagChip from "./TagChip";
import ReviewSection from "./ReviewSection";
import MapBlock from "./map/MapBlock";

export default function DetailView({ cafe }: { cafe: Cafe }) {
  const { t, tr } = useLang();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/cafes" className="text-sm font-semibold text-coffee underline-offset-4 hover:underline">
        ← {t("detail.back")}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl lg:min-h-full">
          <CafeThumb
            cafe={cafe}
            emojiClassName="select-none text-[7rem] drop-shadow-xl"
            sizes="(max-width: 1024px) 100vw, 55vw"
          />
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-3xl font-bold text-espresso">{tr(cafe.name)}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <OpenBadge cafe={cafe} />
              <span className="flex items-center gap-1 text-sm font-semibold text-coffee">
                <RatingStars value={cafe.baseRating} />
                {cafe.baseRating.toFixed(1)}
              </span>
              <span className="rounded-full bg-sand px-2.5 py-1 text-xs font-bold text-espresso">
                {"฿".repeat(cafe.priceRange)}
              </span>
            </div>
            <p className="mt-3 leading-relaxed text-espresso/75">{tr(cafe.description)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cafe.tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </div>
          </div>

          <dl className="grid gap-3 rounded-2xl border border-[#eee3d2] bg-white p-5 text-sm shadow-sm">
            <div>
              <dt className="font-semibold text-espresso">🕒 {t("detail.hours")}</dt>
              <dd className="mt-0.5 text-espresso/70">
                {cafe.openTime} – {cafe.closeTime}
                {cafe.closedDays.length > 0 && (
                  <>
                    {" · "}
                    <span className="text-rose-600">
                      {t("detail.closedDay")}{" "}
                      {cafe.closedDays.map((d) => t(DAY_KEYS[d])).join(", ")}
                    </span>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-espresso">📌 {t("detail.address")}</dt>
              <dd className="mt-0.5 text-espresso/70">{tr(cafe.address)}</dd>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={mapsUrl(cafe)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-coffee px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
              >
                📍 {t("detail.directions")}
              </a>
              {cafe.phone && (
                <a
                  href={`tel:${cafe.phone.replace(/\s/g, "")}`}
                  className="rounded-full border border-latte px-5 py-2.5 text-sm font-semibold text-coffee transition hover:bg-latte/20"
                >
                  📞 {t("detail.call")} {cafe.phone}
                </a>
              )}
            </div>
          </dl>

          <div className="rounded-2xl border border-[#eee3d2] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-espresso/70">
              ⭐ {t("detail.menu")}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {cafe.menuHighlights.map((item) => (
                <li
                  key={item.en}
                  className="rounded-full bg-sand px-3 py-1.5 text-xs font-medium text-coffee"
                >
                  {tr(item)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-espresso">🗺️ {t("detail.onMap")}</h2>
        <MapBlock cafes={[cafe]} className="h-72" />
      </section>

      <div className="mt-8">
        <ReviewSection slug={cafe.slug} baseRating={cafe.baseRating} />
      </div>
    </div>
  );
}
