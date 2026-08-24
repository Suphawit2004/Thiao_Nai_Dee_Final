"use client";

import { useLang } from "@/i18n/LangProvider";
import { useFavorites } from "./FavoritesProvider";

interface FavoriteButtonProps {
  slug: string;
  variant?: "overlay" | "inline";
}

export default function FavoriteButton({ slug, variant = "overlay" }: FavoriteButtonProps) {
  const { t } = useLang();
  const { has, toggle, ready } = useFavorites();
  const active = has(slug);

  const base =
    "grid place-items-center transition hover:scale-110 disabled:opacity-50";
  const style =
    variant === "overlay"
      ? `${base} absolute left-3 top-3 z-10 size-9 rounded-full bg-white/90 shadow-sm`
      : `${base} size-10 shrink-0 self-center rounded-full border border-[#e8dcc8] bg-white`;

  return (
    <button
      type="button"
      disabled={!ready}
      aria-pressed={active}
      aria-label={active ? t("fav.remove") : t("fav.add")}
      title={active ? t("fav.remove") : t("fav.add")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      className={style}
    >
      <span className="text-lg leading-none" aria-hidden>
        {active ? "❤️" : "🤍"}
      </span>
    </button>
  );
}