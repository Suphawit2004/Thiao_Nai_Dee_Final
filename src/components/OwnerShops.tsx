"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useLang } from "@/i18n/LangProvider";
import type { DictKey } from "@/i18n/dictionaries";
import { useCafes } from "@/components/CafesProvider";
import type { MenuCategory, MenuItem } from "@/data/cafes";
import { MENU_CATEGORY_META, MENU_CATEGORY_ORDER } from "@/data/cafes";
import type { OwnerResult } from "@/app/actions/owner";
import {
  addMenuItemFormAction,
  deleteMenuItemFormAction,
  requestOwnership,
  toggleMenuItemFormAction,
  updateMenuItemFormAction,
} from "@/app/actions/owner";

const CATEGORY_LIST: MenuCategory[] = MENU_CATEGORY_ORDER;

function fmtPrice(p: number | null): string {
  if (p == null) return "";
  return p % 1 === 0 ? `฿${p}` : `฿${p.toFixed(2)}`;
}

export default function OwnerShops({ ownedSlugs }: { ownedSlugs: string[] }) {
  const { t, tr } = useLang();
  const { cafes } = useCafes();

  const [requestingSlug, setRequestingSlug] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<Record<string, "sent" | "already" | "error">>({});
  const [messageDraft, setMessageDraft] = useState<Record<string, string>>({});

  const [addState, addAction, addPending] = useActionState(addMenuItemFormAction, undefined);
  const [editState, editAction, editPending] = useActionState(updateMenuItemFormAction, undefined);
  const [deleteState, deleteAction] = useActionState(deleteMenuItemFormAction, undefined);
  const [toggleState, toggleAction] = useActionState(toggleMenuItemFormAction, undefined);

  const [editing, setEditing] = useState<{ slug: string; id: string } | null>(null);

  async function handleRequest(slug: string) {
    setRequestingSlug(slug);
    const res = await requestOwnership(slug, { message: messageDraft[slug] ?? "" });
    setRequestingSlug(null);
    if (res.ok) setRequestStatus((s) => ({ ...s, [slug]: "sent" }));
    else if (res.error === "already_requested" || res.error === "already_owner")
      setRequestStatus((s) => ({ ...s, [slug]: "already" }));
    else setRequestStatus((s) => ({ ...s, [slug]: "error" }));
  }

  const actionError: OwnerResult | undefined = [addState, editState, deleteState, toggleState].find(
    (s) => s?.ok === false
  );

  return (
    <section className="mt-6 rounded-2xl border border-[#eee3d2] bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold text-espresso">🏪 {t("owner.title")}</h2>
      <p className="mt-0.5 text-sm text-espresso/60">{t("owner.desc")}</p>

      {actionError && (
        <p className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
          ⚠️ {t(`owner.error.${actionError.error}` as DictKey)}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {cafes.length === 0 && <p className="text-sm text-espresso/60">⏳ …</p>}
        {cafes.map((cafe) => {
          const isOwner = ownedSlugs.includes(cafe.slug);
          const menuItems = cafe.menuItems ?? [];
          return (
            <div key={cafe.slug} className="rounded-2xl border border-[#eee3d2] bg-cream/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/cafes/${cafe.slug}`}
                  className="font-bold text-espresso hover:text-coffee hover:underline"
                >
                  {tr(cafe.name)}
                </Link>
                {isOwner ? (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                    🏪 {t("owner.badge")}
                  </span>
                ) : (
                  <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-espresso/60">
                    {t("owner.notOwner")}
                  </span>
                )}
              </div>

              {isOwner ? (
                <div className="mt-3">
                  {menuItems.length > 0 && (
                    <div className="space-y-3">
                      {CATEGORY_LIST.map((cat) => {
                        const rows = menuItems.filter((m) => m.category === cat);
                        if (rows.length === 0) return null;
                        return (
                          <div key={cat}>
                            <p className="text-xs font-bold text-coffee/80">
                              {MENU_CATEGORY_META[cat].emoji} {t(`owner.cat.${cat}` as DictKey)}
                            </p>
                            <ul className="mt-1 divide-y divide-[#f7f0e4]">
                              {rows.map((item) =>
                                editing?.slug === cafe.slug && editing.id === item.id ? (
                                  <EditRow
                                    key={item.id}
                                    item={item}
                                    action={editAction}
                                    pending={editPending}
                                    onCancel={() => setEditing(null)}
                                  />
                                ) : (
                                  <li key={item.id} className="flex flex-wrap items-center gap-2 py-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditing({ slug: cafe.slug, id: item.id })}
                                      className={`min-w-0 flex-1 text-left font-medium text-espresso ${
                                        !item.isAvailable ? "line-through opacity-50" : ""
                                      }`}
                                    >
                                      {item.name.th}
                                      {item.name.en && item.name.en !== item.name.th && (
                                        <span className="ml-1.5 font-normal text-espresso/50">
                                          {item.name.en}
                                        </span>
                                      )}
                                      {item.price != null && (
                                        <span className="ml-2 text-coffee">{fmtPrice(item.price)}</span>
                                      )}
                                      {!item.isAvailable && (
                                        <span className="ml-2 text-xs text-rose-500">
                                          {t("detail.soldOut")}
                                        </span>
                                      )}
                                    </button>
                                    <div className="flex items-center gap-1">
                                      <form action={toggleAction}>
                                        <input type="hidden" name="id" value={item.id} />
                                        <input
                                          type="hidden"
                                          name="available"
                                          value={item.isAvailable ? "0" : "1"}
                                        />
                                        <button
                                          title={item.isAvailable ? t("owner.hide") : t("owner.show")}
                                          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                                            item.isAvailable
                                              ? "bg-sand text-espresso/70 hover:bg-latte"
                                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                          }`}
                                        >
                                          {item.isAvailable ? "🙈" : "🟢"}
                                        </button>
                                      </form>
                                      <form action={deleteAction}>
                                        <input type="hidden" name="id" value={item.id} />
                                        <button
                                          onClick={(e) => {
                                            if (!window.confirm(t("owner.deleteConfirm"))) e.preventDefault();
                                          }}
                                          className="rounded-full p-1 text-xs text-rose-500 hover:bg-rose-50"
                                        >
                                          🗑
                                        </button>
                                      </form>
                                    </div>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {menuItems.length === 0 && (
                    <p className="text-sm text-espresso/50">{t("owner.menuEmpty")}</p>
                  )}
                  <AddMenuRow slug={cafe.slug} action={addAction} pending={addPending} />
                </div>
              ) : requestStatus[cafe.slug] === "sent" ? (
                <p className="mt-3 text-sm font-medium text-emerald-700">✓ {t("owner.requestSent")}</p>
              ) : requestStatus[cafe.slug] === "already" ? (
                <p className="mt-3 text-sm font-medium text-amber-700">⚠️ {t("owner.requestAlready")}</p>
              ) : (
                <form
                  className="mt-3 flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRequest(cafe.slug);
                  }}
                >
                  {requestStatus[cafe.slug] === "error" && (
                    <p className="text-xs text-rose-600">{t("owner.requestError")}</p>
                  )}
                  <input
                    value={messageDraft[cafe.slug] ?? ""}
                    onChange={(e) => setMessageDraft((m) => ({ ...m, [cafe.slug]: e.target.value }))}
                    placeholder={t("owner.requestPlaceholder")}
                    maxLength={500}
                    className="w-full rounded-xl border border-[#eee3d2] bg-sand/40 px-3 py-2 text-sm outline-none focus:border-latte focus:bg-white"
                  />
                  <button
                    disabled={requestingSlug === cafe.slug}
                    className="self-start rounded-full bg-coffee px-4 py-1.5 text-sm font-semibold text-cream transition hover:bg-[#684a37] disabled:opacity-50"
                  >
                    {requestingSlug === cafe.slug ? "⏳ " : ""}
                    {t("owner.requestBtn")}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AddMenuRow({
  slug,
  action,
  pending,
}: {
  slug: string;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const { t } = useLang();
  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<MenuCategory>("coffee");

  return (
    <form action={action} className="mt-3 rounded-xl border border-dashed border-[#e0d3bc] bg-white p-3">
      <input type="hidden" name="slug" value={slug} />
      <p className="mb-2 text-xs font-bold text-coffee/80">+ {t("owner.addMenu")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="nameTh"
          value={nameTh}
          onChange={(e) => setNameTh(e.target.value)}
          required
          maxLength={200}
          placeholder={t("owner.nameTh")}
          className="w-full rounded-lg border border-[#eee3d2] bg-sand/40 px-3 py-2 text-sm outline-none focus:border-latte"
        />
        <input
          name="nameEn"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          maxLength={200}
          placeholder={t("owner.nameEn")}
          className="w-full rounded-lg border border-[#eee3d2] bg-sand/40 px-3 py-2 text-sm outline-none focus:border-latte"
        />
        <input
          name="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          step="0.01"
          min="0"
          placeholder={t("owner.price")}
          className="w-full rounded-lg border border-[#eee3d2] bg-sand/40 px-3 py-2 text-sm outline-none focus:border-latte"
        />
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as MenuCategory)}
          className="w-full rounded-lg border border-[#eee3d2] bg-sand/40 px-3 py-2 text-sm outline-none focus:border-latte"
        >
          {CATEGORY_LIST.map((c) => (
            <option key={c} value={c}>
              {MENU_CATEGORY_META[c].emoji} {t(`owner.cat.${c}` as DictKey)}
            </option>
          ))}
        </select>
      </div>
      <button
        disabled={pending}
        className="mt-2 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "⏳" : "+"} {t("owner.save")}
      </button>
    </form>
  );
}

function EditRow({
  item,
  action,
  pending,
  onCancel,
}: {
  item: MenuItem;
  action: (formData: FormData) => void;
  pending: boolean;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [nameTh, setNameTh] = useState(item.name.th);
  const [nameEn, setNameEn] = useState(item.name.en);
  const [price, setPrice] = useState(item.price != null ? String(item.price) : "");
  const [category, setCategory] = useState<MenuCategory>(item.category);

  return (
    <li className="py-1.5">
      <form action={action} className="grid gap-2 rounded-xl border border-latte bg-white p-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={item.id} />
        <input
          name="nameTh"
          value={nameTh}
          onChange={(e) => setNameTh(e.target.value)}
          required
          maxLength={200}
          className="w-full rounded-lg border border-[#eee3d2] bg-sand/40 px-3 py-2 text-sm outline-none focus:border-latte"
        />
        <input
          name="nameEn"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          maxLength={200}
          className="w-full rounded-lg border border-[#eee3d2] bg-sand/40 px-3 py-2 text-sm outline-none focus:border-latte"
        />
        <input
          name="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          step="0.01"
          min="0"
          className="w-full rounded-lg border border-[#eee3d2] bg-sand/40 px-3 py-2 text-sm outline-none focus:border-latte"
        />
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as MenuCategory)}
          className="w-full rounded-lg border border-[#eee3d2] bg-sand/40 px-3 py-2 text-sm outline-none focus:border-latte"
        >
          {CATEGORY_LIST.map((c) => (
            <option key={c} value={c}>
              {MENU_CATEGORY_META[c].emoji} {t(`owner.cat.${c}` as DictKey)}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 sm:col-span-2">
          <button className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">
            {pending ? "⏳" : ""} {t("owner.save")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-espresso/60 hover:underline"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </li>
  );
}
