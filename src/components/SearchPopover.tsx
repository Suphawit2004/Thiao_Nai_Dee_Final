"use client";

import {
  AREA_META,
  AREA_ORDER,
  LIFESTYLE_META,
  LIFESTYLE_ORDER,
  TAG_META,
  TAG_ORDER,
  type CafeArea,
  type CafeTag,
  type LifeStyleTag,
} from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import { useSearch } from "./SearchProvider";

interface SearchPopoverProps {
  open: boolean;
}

const chipBase =
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition";
const chipOff = `${chipBase} border border-[#e8dcc8] bg-white text-espresso/80 hover:border-latte hover:bg-sand/60`;
const chipOn = `${chipBase} border-coffee bg-coffee text-cream`;

export default function SearchPopover({ open }: SearchPopoverProps) {
  const { t, tr } = useLang();
  const { filters, patch, reset } = useSearch();

  if (!open) return null;

  const toggleTag = (tag: CafeTag) =>
    patch({
      tags: filters.tags.includes(tag)
        ? filters.tags.filter((tg) => tg !== tag)
        : [...filters.tags, tag],
    });

  const toggleLife = (life: LifeStyleTag) =>
    patch({
      life: filters.life.includes(life)
        ? filters.life.filter((lt) => lt !== life)
        : [...filters.life, life],
    });

  const dirty =
    filters.query !== "" ||
    filters.tags.length > 0 ||
    filters.life.length > 0 ||
    filters.area !== null ||
    filters.maxPrice !== 0 ||
    filters.openNow ||
    filters.transitionZone;

  const sectionTitle = "text-xs font-semibold uppercase tracking-wide text-espresso/70";

  return (
    <div
      className="absolute left-0 top-full z-[1100] mt-2 max-h-[75vh] w-[min(92vw,26rem)] overflow-y-auto rounded-2xl border border-[#eee3d2] bg-white p-5 shadow-xl"
      role="group"
      aria-label={t("filter.open")}
    >
      <div>
        <span className={sectionTitle}>{t("cafes.tagsLabel")}</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TAG_ORDER.map((tag) => {
            const active = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={active}
                className={active ? chipOn : chipOff}
              >
                <span aria-hidden>{TAG_META[tag].emoji}</span> {tr(TAG_META[tag].label)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <span className={sectionTitle}>{t("cafes.lifestyleLabel")}</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {LIFESTYLE_ORDER.map((life) => {
            const active = filters.life.includes(life);
            return (
              <button
                key={life}
                type="button"
                onClick={() => toggleLife(life)}
                aria-pressed={active}
                className={
                  active ? `${chipBase} border-emerald-700 bg-emerald-700 text-white` : chipOff
                }
              >
                <span aria-hidden>{LIFESTYLE_META[life].emoji}</span>{" "}
                {tr(LIFESTYLE_META[life].label)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <span className={sectionTitle}>{t("cafes.areaLabel")}</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => patch({ area: null })}
            aria-pressed={filters.area === null}
            className={filters.area === null ? chipOn : chipOff}
          >
            {t("cafes.areaAll")}
          </button>
          {AREA_ORDER.map((a) => {
            const active = filters.area === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => patch({ area: a as CafeArea })}
                aria-pressed={active}
                className={active ? chipOn : chipOff}
              >
                <span aria-hidden>{AREA_META[a].emoji}</span> {tr(AREA_META[a].label)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <span className={sectionTitle}>{t("cafes.priceLabel")}</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {([0, 1, 2] as const).map((p) => {
            const active = filters.maxPrice === p;
            const label =
              p === 0
                ? t("cafes.priceAll")
                : `${"฿".repeat(p)} ${t(p === 2 ? "cafes.priceMid" : "cafes.priceBudget")}`;
            return (
              <button
                key={p}
                type="button"
                onClick={() => patch({ maxPrice: p })}
                aria-pressed={active}
                className={active ? chipOn : chipOff}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <span className={sectionTitle}>{t("cafes.statusLabel")}</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => patch({ openNow: !filters.openNow })}
            aria-pressed={filters.openNow}
            className={
              filters.openNow
                ? `${chipBase} border-emerald-700 bg-emerald-700 text-white`
                : chipOff
            }
          >
            🟢 {t("cafes.openNow")}
          </button>
          <button
            type="button"
            onClick={() => patch({ transitionZone: !filters.transitionZone })}
            aria-pressed={filters.transitionZone}
            className={filters.transitionZone ? chipOn : chipOff}
          >
            🛣️ {t("cafes.zone")}
          </button>
        </div>
      </div>

      {dirty && (
        <div className="mt-5 border-t border-[#eee3d2] pt-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-full px-4 py-2 text-sm font-medium text-coffee underline-offset-2 hover:underline"
          >
            ✕ {t("cafes.reset")}
          </button>
        </div>
      )}
    </div>
  );
}