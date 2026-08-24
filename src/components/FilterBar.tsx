"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { useSearch } from "./SearchProvider";
import SearchPopover from "./SearchPopover";
import ActiveFilterChips from "./ActiveFilterChips";

export default function FilterBar({ className = "" }: { className?: string }) {
  const { t } = useLang();
  const { filters } = useSearch();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeCount =
    (filters.query.trim() ? 1 : 0) +
    filters.tags.length +
    filters.life.length +
    (filters.area !== null ? 1 : 0) +
    (filters.maxPrice !== 0 ? 1 : 0) +
    (filters.openNow ? 1 : 0) +
    (filters.transitionZone ? 1 : 0);

  // Close the popover on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${t("filter.open")} (${activeCount})`}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
          open || activeCount > 0
            ? "bg-coffee text-cream hover:bg-[#684a37]"
            : "border border-[#e8dcc8] bg-white text-espresso hover:bg-sand"
        }`}
      >
        <span aria-hidden>⚙️</span> {t("filter.open")}
        {activeCount > 0 && (
          <span className="grid min-w-5 place-items-center rounded-full bg-latte px-1.5 text-xs font-extrabold text-espresso">
            {activeCount}
          </span>
        )}
      </button>

      <SearchPopover open={open} />
      <ActiveFilterChips />
    </div>
  );
}