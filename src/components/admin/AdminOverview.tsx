"use client";

import { useLang } from "@/i18n/LangProvider";
import StatsCard from "./StatsCard";
import type { ActivityItem, AdminStats } from "./types";

function fmtDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleString(lang === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });
}

export default function AdminOverview({
  stats,
  activity,
}: {
  stats: AdminStats;
  activity: ActivityItem[];
}) {
  const { t, lang } = useLang();

  const cards = [
    { icon: "☕", label: t("admin.stat.cafes"), value: stats.cafeCount },
    { icon: "⭐", label: t("admin.stat.reviews"), value: stats.reviewCount },
    { icon: "👤", label: t("admin.stat.users"), value: stats.userCount },
    { icon: "📝", label: t("admin.stat.pendingSuggestions"), value: stats.pendingSuggestions },
    { icon: "🚩", label: t("admin.stat.pendingReports"), value: stats.pendingReports },
    { icon: "❤️", label: t("admin.stat.favorites"), value: stats.favoriteCount },
  ];

  const typeEmoji: Record<string, string> = {
    suggestion: "📝",
    report: "🚩",
    review: "⭐",
  };

  return (
    <div className="mt-5 flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <StatsCard key={c.label} icon={c.icon} label={c.label} value={c.value} />
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-base font-bold text-espresso">🕒 {t("admin.activity.title")}</h2>
        {activity.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#e0d3bc] bg-white/50 p-8 text-center text-sm text-espresso/50">
            {t("admin.activity.empty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-[#eee3d2] bg-white px-4 py-3 shadow-sm"
              >
                <span className="mt-0.5 text-lg" aria-hidden>
                  {typeEmoji[item.type] ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-espresso">{item.detail}</p>
                  <p className="text-xs text-espresso/50">{item.title}</p>
                </div>
                <span className="shrink-0 text-xs text-espresso/40">
                  {fmtDate(item.createdAt, lang)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
