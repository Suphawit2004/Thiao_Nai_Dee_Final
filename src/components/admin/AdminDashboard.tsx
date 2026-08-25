"use client";

import { useState } from "react";
import { CAFES } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import type { DictKey } from "@/i18n/dictionaries";
import {
  deleteReviewFormAction,
  reportFormAction,
  suggestionFormAction,
} from "@/app/actions/admin";

export interface AdminSuggestion {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  openTime: string | null;
  closeTime: string | null;
  priceRange: number | null;
  note: string | null;
  photoUrl: string | null;
  contact: string | null;
  status: string;
  createdAt: string;
}

export interface AdminReport {
  id: string;
  cafeSlug: string;
  field: string;
  message: string;
  suggestedValue: string | null;
  contact: string | null;
  status: string;
  createdAt: string;
}

export interface AdminReview {
  id: string;
  cafe_slug: string;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

type Mode = "ready" | "login" | "forbidden" | "not-configured";

const REPORT_FIELD_KEY: Record<string, string> = {
  hours: "report.field.hours",
  phone: "report.field.phone",
  address: "report.field.address",
  location: "report.field.location",
  closed_days: "report.field.closedDays",
  other: "report.field.other",
};

function StatusBadge({ status, tk }: { status: string; tk: (k: string) => string }) {
  const tone =
    status === "pending"
      ? "bg-amber-100 text-amber-800"
      : status === "approved" || status === "resolved"
        ? "bg-emerald-100 text-emerald-800"
        : "bg-stone-200 text-stone-600";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>
      {tk(`admin.status.${status}`)}
    </span>
  );
}

export default function AdminDashboard({
  mode,
  suggestions = [],
  reports = [],
  reviews = [],
}: {
  mode: Mode;
  suggestions?: AdminSuggestion[];
  reports?: AdminReport[];
  reviews?: AdminReview[];
}) {
  const { t, tr, lang } = useLang();
  const tk = (k: string) => t(k as DictKey);
  const [tab, setTab] = useState<"suggestions" | "reports" | "reviews">("suggestions");

  if (mode !== "ready") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-4xl" aria-hidden>
          🔒
        </p>
        <h1 className="mt-4 text-xl font-bold">{tk(`admin.gate.${mode}`)}</h1>
        {(mode === "login" || mode === "not-configured") && (
          <a
            href="/login"
            className="mt-6 inline-block rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
          >
            {t("nav.login")}
          </a>
        )}
        {mode === "forbidden" && (
          <p className="mt-3 text-sm text-espresso/60">{t("admin.gate.forbiddenHint")}</p>
        )}
      </div>
    );
  }

  const cafeName = (slug: string) => {
    const cafe = CAFES.find((c) => c.slug === slug);
    return cafe ? tr(cafe.name) : slug;
  };

  // Pin the timezone so SSR and client hydration render identical strings.
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(lang === "th" ? "th-TH" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    });

  const pendingSuggestions = suggestions.filter((s) => s.status === "pending").length;
  const pendingReports = reports.filter((r) => r.status === "pending").length;

  const tabs = [
    { key: "suggestions" as const, label: t("admin.tab.suggestions"), badge: pendingSuggestions },
    { key: "reports" as const, label: t("admin.tab.reports"), badge: pendingReports },
    { key: "reviews" as const, label: t("admin.tab.reviews"), badge: 0 },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">🛠️ {t("admin.title")}</h1>
        <p className="mt-1 text-espresso/60">{t("admin.desc")}</p>
      </header>

      <div role="tablist" aria-label={t("admin.title")} className="flex gap-2 border-b border-[#eadfcd] pb-2">
        {tabs.map(({ key, label, badge }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === key ? "bg-coffee text-cream" : "text-espresso/70 hover:bg-sand"
            }`}
          >
            {label}
            {badge > 0 && (
              <span className="ml-1.5 rounded-full bg-latte px-1.5 text-xs font-extrabold text-espresso">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "suggestions" && (
        <section className="mt-5 flex flex-col gap-4">
          {suggestions.length === 0 && <EmptyRow label={t("admin.empty.suggestions")} />}
          {suggestions.map((s) => (
            <article
              key={s.id}
              className="rounded-2xl border border-[#eee3d2] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">{s.name}</h3>
                <StatusBadge status={s.status} tk={tk} />
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                {s.address && (
                  <div>
                    <dt className="inline text-espresso/50">{t("report.field.address")}: </dt>
                    <dd className="inline">{s.address}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline text-espresso/50">{t("detail.hours")}: </dt>
                  <dd className="inline">
                    {s.openTime ?? "--:--"} – {s.closeTime ?? "--:--"}
                  </dd>
                </div>
                {s.priceRange != null && (
                  <div>
                    <dt className="inline text-espresso/50">{t("cafes.priceLabel")}: </dt>
                    <dd className="inline">
                      {s.priceRange === 1 ? t("cafes.priceBudget") : t("cafes.priceMid")}
                    </dd>
                  </div>
                )}
                {s.contact && (
                  <div>
                    <dt className="inline text-espresso/50">{t("report.contact")}: </dt>
                    <dd className="inline">{s.contact}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline text-espresso/50">{t("admin.suggest.location")}: </dt>
                  <dd className="inline">
                    <a
                      className="text-coffee underline underline-offset-2 hover:text-espresso"
                      href={`https://www.google.com/maps?q=${s.lat},${s.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.lat.toFixed(5)}, {s.lng.toFixed(5)} ↗
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="inline text-espresso/50">{t("admin.sentAt")}: </dt>
                  <dd className="inline">{fmt(s.createdAt)}</dd>
                </div>
              </dl>

              {s.note && <p className="mt-3 rounded-xl bg-sand/50 p-3 text-sm">💬 {s.note}</p>}
              {s.photoUrl && (
                <a
                  href={s.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-coffee underline underline-offset-2 hover:text-espresso"
                >
                  📷 {t("admin.suggest.photo")} ↗
                </a>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {s.status !== "approved" && (
                  <form action={suggestionFormAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      name="status"
                      value="approved"
                      className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      ✓ {t("admin.approve")}
                    </button>
                  </form>
                )}
                {s.status !== "rejected" && (
                  <form action={suggestionFormAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      name="status"
                      value="rejected"
                      className="rounded-full border border-[#e8dcc8] px-4 py-1.5 text-sm font-semibold text-espresso/80 transition hover:bg-sand"
                    >
                      ✕ {t("admin.reject")}
                    </button>
                  </form>
                )}
                {s.status !== "pending" && (
                  <form action={suggestionFormAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      name="status"
                      value="pending"
                      className="rounded-full px-4 py-1.5 text-sm font-medium text-coffee underline-offset-2 hover:underline"
                    >
                      ↺ {t("admin.reopen")}
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === "reports" && (
        <section className="mt-5 flex flex-col gap-4">
          {reports.length === 0 && <EmptyRow label={t("admin.empty.reports")} />}
          {reports.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-[#eee3d2] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">
                  <a href={`/cafes/${r.cafeSlug}`} className="hover:text-coffee hover:underline">
                    {cafeName(r.cafeSlug)} ↗
                  </a>
                </h3>
                <StatusBadge status={r.status} tk={tk} />
              </div>

              <p className="mt-2 text-sm">
                <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold">
                  {REPORT_FIELD_KEY[r.field] ? tk(REPORT_FIELD_KEY[r.field]) : r.field}
                </span>
              </p>
              <p className="mt-2 text-sm">💬 {r.message}</p>

              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {r.suggestedValue && (
                  <div>
                    <dt className="inline text-espresso/50">{t("report.suggested")}: </dt>
                    <dd className="inline">{r.suggestedValue}</dd>
                  </div>
                )}
                {r.contact && (
                  <div>
                    <dt className="inline text-espresso/50">{t("report.contact")}: </dt>
                    <dd className="inline">{r.contact}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline text-espresso/50">{t("admin.sentAt")}: </dt>
                  <dd className="inline">{fmt(r.createdAt)}</dd>
                </div>
              </dl>

              {r.status === "pending" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={reportFormAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      name="status"
                      value="resolved"
                      className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      ✓ {t("admin.resolve")}
                    </button>
                  </form>
                  <form action={reportFormAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      name="status"
                      value="dismissed"
                      className="rounded-full border border-[#e8dcc8] px-4 py-1.5 text-sm font-semibold text-espresso/80 transition hover:bg-sand"
                    >
                      ✕ {t("admin.dismiss")}
                    </button>
                  </form>
                </div>
              ) : (
                <p className="mt-4 text-xs text-espresso/40">{fmt(r.createdAt)}</p>
              )}
            </article>
          ))}
        </section>
      )}

      {tab === "reviews" && (
        <section className="mt-5 flex flex-col gap-4">
          {reviews.length === 0 && <EmptyRow label={t("admin.empty.reviews")} />}
          {reviews.map((rv) => (
            <article
              key={rv.id}
              className="rounded-2xl border border-[#eee3d2] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">
                  <a href={`/cafes/${rv.cafe_slug}`} className="hover:text-coffee hover:underline">
                    {cafeName(rv.cafe_slug)} ↗
                  </a>
                </h3>
                <span className="text-sm text-amber-500" aria-label={`${rv.rating}/5`}>
                  {"★".repeat(rv.rating)}
                  <span className="text-espresso/20">{"★".repeat(5 - rv.rating)}</span>
                </span>
              </div>
              <p className="mt-1 text-xs text-espresso/50">
                {t("admin.review.by").replace("{name}", rv.author_name)} · {fmt(rv.created_at)}
              </p>
              {rv.comment && <p className="mt-2 text-sm">💬 {rv.comment}</p>}
              <form action={deleteReviewFormAction} className="mt-3">
                <input type="hidden" name="id" value={rv.id} />
                <button
                  onClick={(e) => {
                    if (!window.confirm(t("admin.confirmDeleteReview"))) e.preventDefault();
                  }}
                  className="rounded-full border border-red-200 px-4 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  🗑 {t("admin.delete")}
                </button>
              </form>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-[#e0d3bc] bg-white/50 p-10 text-center text-sm text-espresso/50">
      {label}
    </p>
  );
}
