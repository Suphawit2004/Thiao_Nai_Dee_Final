"use client";

import { useLang } from "@/i18n/LangProvider";

const STACK = ["Next.js 16", "TypeScript", "Tailwind CSS v4", "Leaflet + OpenStreetMap", "Supabase"];

export default function AboutView() {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-espresso">{t("about.title")}</h1>
      <div className="mt-5 space-y-4 leading-relaxed text-espresso/80">
        <p>{t("about.p1")}</p>
        <p>{t("about.p2")}</p>
        <p>{t("about.p3")}</p>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-espresso/70">
          🛠️ {t("about.stackTitle")}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {STACK.map((item) => (
            <li key={item} className="rounded-full bg-sand px-3 py-1.5 text-xs font-semibold text-coffee">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
