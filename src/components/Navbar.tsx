"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { useAuth } from "./AuthProvider";
import { useFavorites } from "./FavoritesProvider";
import { useSearch } from "./SearchProvider";
import SearchSuggestions from "./SearchSuggestions";

const LINKS = [
  { href: "/", key: "nav.home" },
  { href: "/cafes", key: "nav.cafes" },
  { href: "/map", key: "nav.map" },
  { href: "/about", key: "nav.about" },
] as const;

export default function Navbar() {
  const { t, toggle } = useLang();
  const { user, loading } = useAuth();
  const { slugs } = useFavorites();
  const { filters, patch } = useSearch();
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false); // mobile menu
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [sugOpen, setSugOpen] = useState(false); // name suggestions
  const headerRef = useRef<HTMLElement>(null);

  const hasQuery = filters.query.trim().length > 0;
  const activeCount =
    (filters.query.trim() ? 1 : 0) +
    filters.tags.length +
    filters.life.length +
    (filters.area !== null ? 1 : 0) +
    (filters.maxPrice !== 0 ? 1 : 0) +
    (filters.openNow ? 1 : 0) +
    (filters.transitionZone ? 1 : 0);

  // Close the suggestions on outside-header click or Escape
  useEffect(() => {
    if (!sugOpen) return;
    const onDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setSugOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSugOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [sugOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkClass = (href: string) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      isActive(href)
        ? "bg-coffee text-cream"
        : "text-espresso/80 hover:bg-sand hover:text-espresso"
    }`;

  const favLabel =
    slugs.length > 0
      ? `❤️ ${t("nav.favorites")} (${slugs.length})`
      : `🤍 ${t("nav.favorites")}`;

  const searchInput = (
    <div className="relative flex-1">
      <span
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-espresso/40"
        aria-hidden
      >
        🔍
      </span>
      <input
        type="search"
        value={filters.query}
        onChange={(e) => {
          patch({ query: e.target.value });
          if (e.target.value.trim()) setSugOpen(true);
        }}
        onFocus={() => {
          if (filters.query.trim()) setSugOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !pathname.startsWith("/cafes")) router.push("/cafes");
          if (e.key === "Escape") setSugOpen(false);
        }}
        placeholder={t("cafes.searchPlaceholder")}
        aria-label={t("cafes.searchPlaceholder")}
        className="w-full rounded-full bg-transparent py-2 pl-10 pr-3 text-sm outline-none"
      />
      <SearchSuggestions open={sugOpen} onClose={() => setSugOpen(false)} />
    </div>
  );

  const searchClear = hasQuery ? (
    <button
      type="button"
      onClick={() => {
        patch({ query: "" });
        setSugOpen(false);
      }}
      aria-label={t("cafes.reset")}
      title={t("cafes.reset")}
      className="mr-1 shrink-0 rounded-full px-2 py-1 text-xs font-bold text-espresso/50 transition hover:bg-white hover:text-coffee"
    >
      ✕
    </button>
  ) : null;

  return (
    <header ref={headerRef} className="sticky top-0 z-[1000] border-b border-[#eadfcd] bg-cream/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
          <span
            className="grid size-9 place-items-center rounded-xl bg-coffee text-lg text-cream shadow-sm"
            aria-hidden
          >
            ☕
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-base font-bold text-espresso">{t("brand.name")}</span>
            <span className="block text-[11px] font-medium tracking-wide text-coffee">
              {t("brand.sub")}
            </span>
          </span>
        </Link>

        {/* Desktop search — beside the logo */}
        <div className="relative hidden max-w-md flex-1 md:block">
          <div className="flex items-center rounded-full border border-[#eee3d2] bg-sand/40 p-1 shadow-sm focus-within:border-latte focus-within:bg-white">
            {searchInput}
            {searchClear}
          </div>
        </div>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label={t("nav.main")}>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {t(l.key)}
            </Link>
          ))}
          <button
            type="button"
            onClick={toggle}
            className="ml-2 rounded-full border border-latte px-3.5 py-1.5 text-xs font-bold text-coffee transition hover:bg-latte/20"
          >
            {t("lang.switchTo")}
          </button>
          <Link href="/favorites" className={linkClass("/favorites")}>
            {favLabel}
          </Link>
          {!loading && (
            <Link
              href={user ? "/profile" : "/login"}
              className={linkClass(user ? "/profile" : "/login")}
            >
              {user ? `👤 ${t("nav.profile")}` : `🔑 ${t("nav.login")}`}
            </Link>
          )}
        </nav>

        {/* Mobile controls */}
        <div className="ml-auto flex items-center gap-1.5 md:hidden">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-expanded={mobileSearchOpen}
            aria-label={t("cafes.searchPlaceholder")}
            className={`relative rounded-lg p-2 text-lg leading-none transition ${
              mobileSearchOpen || activeCount > 0
                ? "bg-coffee text-cream"
                : "text-espresso hover:bg-sand"
            }`}
          >
            🔍
            {activeCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-latte px-1 text-[10px] font-extrabold text-espresso">
                {activeCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={toggle}
            className="rounded-full border border-latte px-3 py-1.5 text-xs font-bold text-coffee"
          >
            {t("lang.switchTo")}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={t("nav.menuToggle")}
            className="rounded-lg p-2 text-xl leading-none text-espresso hover:bg-sand"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile search row */}
      {mobileSearchOpen && (
        <div className="border-t border-[#eadfcd] px-4 py-3 md:hidden">
          <div className="flex items-center rounded-full border border-[#eee3d2] bg-sand/40 p-1 shadow-sm focus-within:border-latte focus-within:bg-white">
            {searchInput}
            {searchClear}
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {open && (
        <nav
          className="border-t border-[#eadfcd] bg-cream px-4 py-3 md:hidden"
          aria-label={t("nav.main")}
        >
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                  isActive(l.href) ? "bg-coffee text-cream" : "text-espresso hover:bg-sand"
                }`}
              >
                {t(l.key)}
              </Link>
            ))}
            <Link
              href="/favorites"
              onClick={() => setOpen(false)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                isActive("/favorites") ? "bg-coffee text-cream" : "text-espresso hover:bg-sand"
              }`}
            >
              {favLabel}
            </Link>
            {!loading && (
              <Link
                href={user ? "/profile" : "/login"}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                  isActive(user ? "/profile" : "/login")
                    ? "bg-coffee text-cream"
                    : "text-espresso hover:bg-sand"
                }`}
              >
                {user ? `👤 ${t("nav.profile")}` : `🔑 ${t("nav.login")}`}
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}