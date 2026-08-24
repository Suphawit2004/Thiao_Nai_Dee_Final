"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CAFES, type CafeTag } from "@/data/cafes";
import { getOpenStatus } from "@/lib/hours";
import { useLang } from "@/i18n/LangProvider";
import CafeCard from "./CafeCard";
import { useNowTick } from "./OpenBadge";
import SearchFilter, { INITIAL_FILTERS, type FilterState } from "./SearchFilter";

interface CafesExplorerProps {
  initialTag?: CafeTag | null;
}

export default function CafesExplorer({ initialTag = null }: CafesExplorerProps) {
  const { t, tr, lang } = useLang();
  const nowTick = useNowTick();

  const [filters, setFilters] = useState<FilterState>(() => ({
    ...INITIAL_FILTERS,
    tags: initialTag ? [initialTag] : [],
  }));

  const results = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const locale = lang === "th" ? "th" : "en";
    return CAFES.filter((cafe) => {
      if (q) {
        const haystack = `${cafe.name.th} ${cafe.name.en} ${cafe.address.th} ${cafe.address.en}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.tags.length > 0 && !filters.tags.some((tg) => cafe.tags.includes(tg))) {
        return false;
      }
      if (filters.maxPrice !== 0 && cafe.priceRange > filters.maxPrice) return false;
      if (filters.openNow && !getOpenStatus(cafe, nowTick === 0 ? undefined : new Date(nowTick)).isOpenNow) {
        return false;
      }
      return true;
    }).sort((a, b) => b.baseRating - a.baseRating || tr(a.name).localeCompare(tr(b.name), locale));
  }, [filters, tr, lang, nowTick]);

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
