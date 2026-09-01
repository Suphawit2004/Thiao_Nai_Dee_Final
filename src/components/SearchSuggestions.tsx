"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AREA_META, type Cafe } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import { useCafes } from "./CafesProvider";
import { useSearch } from "./SearchProvider";
import { fuzzyMatch } from "@/lib/fuzzy";
import { gradientFor } from "@/lib/thumbs";

interface ScoredCafe {
  cafe: Cafe;
  score: number;
}

interface SearchSuggestionsProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchSuggestions({ open, onClose }: SearchSuggestionsProps) {
  const { t, tr } = useLang();
  const { filters } = useSearch();
  const { cafes: CAFES } = useCafes();
  const router = useRouter();
  const query = filters.query.trim();

  const matches = useMemo<ScoredCafe[]>(() => {
    if (!query) return [];
    return CAFES.map((cafe) => ({
      cafe,
      score: Math.max(
        fuzzyMatch(cafe.name.th, query) ?? -1,
        fuzzyMatch(cafe.name.en, query) ?? -1
      ),
    }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.cafe.baseRating - a.cafe.baseRating)
      .slice(0, 5);
  }, [query, CAFES]);

  if (!open || !query) return null;

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="absolute inset-x-0 top-full z-[1150] mt-2 overflow-hidden rounded-2xl border border-[#eee3d2] bg-white shadow-xl">
      {matches.length === 0 ? (
        <p className="px-4 py-4 text-sm text-espresso/70">{t("cafes.emptyHint")}</p>
      ) : (
        <ul className="divide-y divide-[#f3ead9]">
          {matches.map(({ cafe }) => (
            <li key={cafe.slug}>
              <Link
                href={`/cafes/${cafe.slug}`}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-sand/50"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-base"
                  style={{ background: gradientFor(cafe.slug) }}
                  aria-hidden
                >
                  ☕
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-espresso">
                    {tr(cafe.name)}
                  </span>
                  <span className="block truncate text-xs text-espresso/60">
                    {AREA_META[cafe.area].emoji} {tr(AREA_META[cafe.area].label)} ·{" "}
                    {"฿".repeat(cafe.priceRange)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => go("/cafes")}
        className="flex w-full items-center justify-between bg-sand/40 px-4 py-2.5 text-xs font-bold text-coffee transition hover:bg-sand"
      >
        <span>🔍 {t("home.viewAll")}</span>
        <span aria-hidden>→</span>
      </button>
    </div>
  );
}