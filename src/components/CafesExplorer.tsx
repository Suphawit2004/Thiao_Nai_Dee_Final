"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CAFES, type CafeArea, type CafeTag, type LifeStyleTag } from "@/data/cafes";
import { getOpenStatus } from "@/lib/hours";
import { useLang } from "@/i18n/LangProvider";
import { filterByMaxDistance, getCafesBetweenAreas, MAX_DISTANCE_KM } from "@/lib/cafes-between";
import CafeCard from "./CafeCard";
import { useNowTick } from "./OpenBadge";
import SearchFilter, { INITIAL_FILTERS, type FilterState } from "./SearchFilter";

export interface InitialFilters {
  query?: string;
  tags?: CafeTag[];
  life?: LifeStyleTag[];
  area?: CafeArea | null;
  maxPrice?: 0 | 1 | 2;
  openNow?: boolean;
  transitionZone?: boolean;
}

const PATHNAME = "/cafes";

function filtersToQuery(f: FilterState): string {
  const params = new URLSearchParams();
  const q = f.query.trim();
  if (q) params.set("q", q);
  if (f.tags.length > 0) params.set("tag", f.tags.join(","));
  if (f.life.length > 0) params.set("life", f.life.join(","));
  if (f.area) params.set("area", f.area);
  if (f.maxPrice !== 0) params.set("price", String(f.maxPrice));
  if (f.openNow) params.set("open", "1");
  if (f.transitionZone) params.set("zone", "1");
  return params.toString();
}

export default function CafesExplorer({ initialFilters = {} }: { initialFilters?: InitialFilters }) {
  const { t, tr, lang } = useLang();
  const nowTick = useNowTick();

  const [filters, setFilters] = useState<FilterState>(() => ({
    ...INITIAL_FILTERS,
    query: initialFilters.query ?? "",
    tags: initialFilters.tags ?? [],
    life: initialFilters.life ?? [],
    area: initialFilters.area ?? null,
    maxPrice: initialFilters.maxPrice ?? 0,
    openNow: initialFilters.openNow ?? false,
    transitionZone: initialFilters.transitionZone ?? false,
  }));

  // Debounce the search text so typing doesn't re-filter on every keystroke
  const debouncedQuery = useDebouncedValue(filters.query, 300);

  // Keep the URL in sync so filtered views can be shared (no navigation)
  useEffect(() => {
    const qs = filtersToQuery(filters);
    const url = qs ? `${PATHNAME}?${qs}` : PATHNAME;
    window.history.replaceState(null, "", url);
  }, [filters]);

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const locale = lang === "th" ? "th" : "en";
    let filtered = CAFES.filter((cafe) => {
      if (q) {
        const haystack =
          `${cafe.name.th} ${cafe.name.en} ${cafe.address.th} ${cafe.address.en} ` +
          `${cafe.tags.join(" ")} ${cafe.lifestyleTags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.tags.length > 0 && !filters.tags.some((tg) => cafe.tags.includes(tg))) {
        return false;
      }
      if (
        filters.life.length > 0 &&
        !filters.life.every((lt) => cafe.lifestyleTags.includes(lt))
      ) {
        return false;
      }
      if (filters.area !== null && cafe.area !== filters.area) return false;
      if (filters.maxPrice !== 0 && cafe.priceRange > filters.maxPrice) return false;
      if (
        filters.openNow &&
        !getOpenStatus(cafe, nowTick === 0 ? undefined : new Date(nowTick)).isOpenNow
      ) {
        return false;
      }
      return true;
    });

    if (filters.transitionZone) {
      const distances = getCafesBetweenAreas(filtered);
      filtered = filterByMaxDistance(distances, MAX_DISTANCE_KM).map((d) => d.cafe);
    }

    return filtered.sort(
      (a, b) => b.baseRating - a.baseRating || tr(a.name).localeCompare(tr(b.name), locale)
    );
  }, [debouncedQuery, filters, tr, lang, nowTick]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-espresso">{t("cafes.title")}</h1>
        <p className="mt-1 text-espresso/60">{t("cafes.subtitle")}</p>
      </header>

      <SearchFilter
        state={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onReset={() => setFilters(INITIAL_FILTERS)}
      />

      <p className="mt-5 text-sm font-semibold text-espresso/70" aria-live="polite">
        {t("cafes.found").replaceAll("{n}", String(results.length))}
      </p>

      {results.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#d9c9ac] bg-white/60 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-espresso/80">{t("cafes.empty")}</p>
          <p className="mt-1 text-sm text-espresso/70">{t("cafes.emptyHint")}</p>
          <button
            type="button"
            onClick={() => setFilters(INITIAL_FILTERS)}
            className="mt-5 rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
          >
            {t("cafes.reset")}
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((cafe) => (
            <CafeCard key={cafe.slug} cafe={cafe} />
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/map"
          className="inline-block rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
        >
          📍 {t("home.openMap")}
        </Link>
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}