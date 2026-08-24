"use client";

import { TAG_META, TAG_ORDER, type CafeTag } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";

export interface FilterState {
  query: string;
  tags: CafeTag[];
  maxPrice: 0 | 1 | 2;
  openNow: boolean;
}

export const INITIAL_FILTERS: FilterState = { query: "", tags: [], maxPrice: 0, openNow: false };

interface SearchFilterProps {
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}

export default function SearchFilter({ state, onChange, onReset }: SearchFilterProps) {
  const { t, tr } = useLang();

  const toggleTag = (tag: CafeTag) => {
    const next = state.tags.includes(tag)
      ? state.tags.filter((tg) => tg !== tag)
      : [...state.tags, tag];
    onChange({ tags: next });
  };

  const dirty =
    state.query !== "" || state.tags.length > 0 || state.maxPrice !== 0 || state.openNow;

  return (
    <div className="rounded-2xl border border-[#eee3d2] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-espresso/40" aria-hidden>
            🔍
          </span>
          <input
            type="search"
            value={state.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder={t("cafes.searchPlaceholder")}
            className="w-full rounded-xl border border-[#e8dcc8] bg-sand/40 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-latte focus:bg-white"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={state.maxPrice}
            onChange={(e) => onChange({ maxPrice: Number(e.target.value) as FilterState["maxPrice"] })}
            aria-label={t("cafes.priceLabel")}
            className="rounded-xl border border-[#e8dcc8] bg-sand/40 px-3 py-2.5 text-sm font-medium outline-none focus:border-latte focus:bg-white"
          >
            <option value={0}>{t("cafes.priceAll")}</option>
            <option value={1}>{t("cafes.priceBudget")}</option>
            <option value={2}>{t("cafes.priceMid")}</option>
          </select>

          <button
            type="button"
            onClick={() => onChange({ openNow: !state.openNow })}
            aria-pressed={state.openNow}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              state.openNow
                ? "bg-emerald-600 text-white"
                : "border border-[#e8dcc8] bg-sand/40 text-espresso hover:bg-sand"
            }`}
          >
            🟢 {t("cafes.openNow")}
          </button>

          {dirty && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-coffee underline-offset-2 hover:underline"
            >
              ✕ {t("cafes.reset")}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-espresso/50">
          {t("cafes.tagsLabel")}
        </span>
        {TAG_ORDER.map((tag) => {
          const active = state.tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-coffee bg-coffee text-cream"
                  : "border-[#e8dcc8] bg-white text-espresso/80 hover:border-latte hover:bg-sand/60"
              }`}
            >
              <span aria-hidden>{TAG_META[tag].emoji}</span> {tr(TAG_META[tag].label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
