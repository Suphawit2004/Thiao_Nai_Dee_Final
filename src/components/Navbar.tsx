"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { useAuth } from "./AuthProvider";
import { useFavorites } from "./FavoritesProvider";

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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const favLabel =
    slugs.length > 0 ? `❤️ ${t("nav.favorites")} (${slugs.length})` : `🤍 ${t("nav.favorites")}`;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkClass = (href: string) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      isActive(href)
        ? "bg-coffee text-cream"
        : "text-espresso/80 hover:bg-sand hover:text-espresso"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-[#eadfcd] bg-cream/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="grid size-9 place-items-center rounded-xl bg-coffee text-lg text-cream shadow-sm" aria-hidden>
            ☕
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold text-espresso">{t("brand.name")}</span>
            <span className="block text-[11px] font-medium tracking-wide text-coffee">
              {t("brand.sub")}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t("nav.main")}>
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
            <Link href={user ? "/profile" : "/login"} className={linkClass(user ? "/profile" : "/login")}>
              {user ? `👤 ${t("nav.profile")}` : `🔑 ${t("nav.login")}`}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
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

      {open && (
        <nav className="border-t border-[#eadfcd] bg-cream px-4 py-3 md:hidden" aria-label={t("nav.main")}>
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
