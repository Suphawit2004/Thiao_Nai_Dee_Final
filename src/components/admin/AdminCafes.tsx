"use client";

import { useActionState, useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { AREA_META } from "@/data/cafes";
import {
  deleteCafeFormAction,
  setCafeActiveFormAction,
} from "@/app/actions/admin-cafes";
import { setCafeOwnerFormAction } from "@/app/actions/admin-owners";
import CafeFormModal from "./CafeFormModal";
import type { AdminCafe } from "./types";

export default function AdminCafes({
  cafes,
  ownerEmailById = {},
}: {
  cafes: AdminCafe[];
  ownerEmailById?: Record<string, string>;
}) {
  const { t, tr } = useLang();
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<AdminCafe | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingOwner, setEditingOwner] = useState<string | null>(null);

  const [deleteState, deleteAction] = useActionState(deleteCafeFormAction, undefined);
  const [activeState, activeAction] = useActionState(setCafeActiveFormAction, undefined);
  const [ownerState, ownerAction] = useActionState(setCafeOwnerFormAction, undefined);

  const error = deleteState?.ok === false ? deleteState.error : activeState?.ok === false ? activeState.error : ownerState?.ok === false ? ownerState.error : null;

  const filtered = cafes.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name_th.toLowerCase().includes(q) ||
      c.name_en.toLowerCase().includes(q) ||
      c.slug.includes(q)
    );
  });

  const areaLabel = (a: AdminCafe["area"]) =>
    `${AREA_META[a].emoji} ${tr(AREA_META[a].label)}`;

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("cafes.searchPlaceholder")}
          className="min-w-0 flex-1 rounded-full border border-[#eee3d2] bg-white px-4 py-2 text-sm outline-none focus:border-latte"
        />
        <button
          onClick={() => setAdding(true)}
          className="rounded-full bg-coffee px-5 py-2 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
        >
          + {t("admin.cafe.add")}
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#e0d3bc] bg-white/50 p-8 text-center text-sm text-espresso/50">
          {t("admin.cafe.empty")}
        </p>
      ) : (
        filtered.map((c) => (
          <article
            key={c.slug}
            className="rounded-2xl border border-[#eee3d2] bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span
                  className={`size-2.5 rounded-full ${c.is_active ? "bg-emerald-500" : "bg-stone-300"}`}
                  aria-hidden
                />
                <h3 className="font-bold text-espresso">
                  {c.name_th}
                  <span className="ml-2 font-medium text-espresso/50">{c.name_en}</span>
                </h3>
                {!c.is_active && (
                  <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-bold text-stone-600">
                    {t("admin.cafe.inactive")}
                  </span>
                )}
                {c.owner_id && (
                  <span
                    className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700"
                    title={ownerEmailById[c.owner_id] ?? c.owner_id}
                  >
                    🏪 {t("admin.cafe.ownerBadge")}
                    {ownerEmailById[c.owner_id] && <span className="ml-1 font-medium">· {ownerEmailById[c.owner_id]}</span>}
                  </span>
                )}
              </div>
              <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-espresso/70">
                {areaLabel(c.area)}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-espresso/70">
              <span>⭐ {Number(c.base_rating).toFixed(1)}</span>
              <span>🕒 {c.open_time}–{c.close_time}</span>
              {c.address_th && <span className="truncate">📍 {c.address_th}</span>}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {c.tags.length > 0 && (
                <span className="flex flex-wrap gap-1">
                  {c.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-sand/50 px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                </span>
              )}
              <span className="ml-auto flex gap-2">
                <form action={activeAction}>
                  <input type="hidden" name="slug" value={c.slug} />
                  <input type="hidden" name="active" value={c.is_active ? "0" : "1"} />
                  <button
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      c.is_active
                        ? "border-[#e8dcc8] text-espresso/70 hover:bg-sand"
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {c.is_active ? t("admin.cafe.deactivate") : t("admin.cafe.activate")}
                  </button>
                </form>
                <button
                  onClick={() => {
                    setModal(c);
                    setAdding(false);
                  }}
                  className="rounded-full bg-latte px-3 py-1.5 text-xs font-semibold text-coffee transition hover:bg-latte/40"
                >
                  ✏️ {t("admin.cafe.edit")}
                </button>
                <form action={deleteAction}>
                  <input type="hidden" name="slug" value={c.slug} />
                  <button
                    onClick={(e) => {
                      if (
                        !window.confirm(
                          t("admin.cafe.deleteConfirm").replace("{name}", c.name_th)
                        )
                      )
                        e.preventDefault();
                    }}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    🗑 {t("admin.cafe.delete")}
                  </button>
                </form>
              </span>
            </div>

            {editingOwner === c.slug ? (
              <form action={ownerAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="slug" value={c.slug} />
                <input
                  name="owner"
                  defaultValue={c.owner_id ? (ownerEmailById[c.owner_id] ?? "") : ""}
                  placeholder={t("admin.cafe.ownerPlaceholder")}
                  className="min-w-0 flex-1 rounded-full border border-[#eee3d2] bg-sand/40 px-3 py-1.5 text-sm outline-none focus:border-latte focus:bg-white"
                />
                <button className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700">
                  {t("admin.save")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingOwner(null)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-espresso/60 hover:underline"
                >
                  {t("common.cancel")}
                </button>
              </form>
            ) : (
              <button
                onClick={() => setEditingOwner(c.slug)}
                className="mt-3 rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
              >
                🏪 {t("admin.cafe.setOwner")}
              </button>
            )}
          </article>
        ))
      )}

      {(adding || modal) && (
        <CafeFormModal cafe={modal} onClose={() => {
          setModal(null);
          setAdding(false);
        }} />
      )}
    </div>
  );
}
