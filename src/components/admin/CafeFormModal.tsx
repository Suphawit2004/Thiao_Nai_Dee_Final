"use client";

import { useActionState, useEffect, useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import type { DictKey } from "@/i18n/dictionaries";
import { createCafeFormAction, updateCafeFormAction } from "@/app/actions/admin-cafes";
import type { AdminCafe } from "./types";
import { AREA_META, AREA_ORDER, LIFESTYLE_META, LIFESTYLE_ORDER, TAG_META, TAG_ORDER } from "@/data/cafes";

export default function CafeFormModal({
  cafe,
  onClose,
}: {
  cafe: AdminCafe | null;
  onClose: () => void;
}) {
  const { t, tr } = useLang();
  const tk = (k: string) => t(k as DictKey);
  const isEdit = cafe !== null;

  const [state, action, isPending] = useActionState(
    isEdit ? updateCafeFormAction : createCafeFormAction,
    undefined
  );

  useEffect(() => {
    if (state?.ok === true) onClose();
  }, [state, onClose]);

  const [form, setForm] = useState(
    () =>
      ({
        slug: cafe?.slug ?? "",
        nameTh: cafe?.name_th ?? "",
        nameEn: cafe?.name_en ?? "",
        descTh: cafe?.description_th ?? "",
        descEn: cafe?.description_en ?? "",
        addressTh: cafe?.address_th ?? "",
        addressEn: cafe?.address_en ?? "",
        phone: cafe?.phone ?? "",
        openTime: cafe?.open_time ?? "08:00",
        closeTime: cafe?.close_time ?? "17:00",
        closedDays: cafe?.closed_days ?? [],
        priceRange: cafe?.price_range ?? 2,
        tags: cafe?.tags ?? [],
        lifestyleTags: cafe?.lifestyle_tags ?? [],
        area: cafe?.area ?? "lakeside",
        lat: cafe?.lat ?? 19.16,
        lng: cafe?.lng ?? 99.9,
        photo: cafe?.photo ?? "",
        baseRating: cafe?.base_rating ?? 4.0,
        menuTh: (cafe?.menu_highlights ?? []).map((h) => h.th),
        menuEn: (cafe?.menu_highlights ?? []).map((h) => h.en),
      }) as Record<string, unknown>
  );

  const get = (k: string): string => String(form[k] ?? "");
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const toggle = (k: string, v: string) => {
    const arr = Array.isArray(form[k]) ? (form[k] as string[]) : [];
    set(k, arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const addMenuRow = () => {
    set("menuTh", [...(form.menuTh as string[]), ""]);
    set("menuEn", [...(form.menuEn as string[]), ""]);
  };
  const setMenu = (idx: number, which: "menuTh" | "menuEn", v: string) => {
    const arr = [...(form[which] as string[])];
    arr[idx] = v;
    set(which, arr);
  };
  const removeMenu = (idx: number) => {
    set(
      "menuTh",
      (form.menuTh as string[]).filter((_, i) => i !== idx)
    );
    set(
      "menuEn",
      (form.menuEn as string[]).filter((_, i) => i !== idx)
    );
  };

  const error = state?.ok === false ? state.error : null;

  const inputCls =
    "w-full rounded-xl border border-[#eee3d2] bg-sand/40 px-3 py-2 text-sm outline-none focus:border-latte focus:bg-white";

  const renderLabel = (k: string) => (
    <label className="mb-1 block text-xs font-semibold text-espresso/60">{tk(k)}</label>
  );

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-espresso/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-2xl border border-[#eee3d2] bg-cream p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-espresso">
            {isEdit ? t("admin.cafe.form.title.edit") : t("admin.cafe.form.title.new")}
          </h3>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-lg p-1.5 text-lg leading-none text-espresso/60 hover:bg-sand"
          >
            ✕
          </button>
        </div>

        <form action={action}>
          <input type="hidden" name="slug" value={get("slug")} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              {renderLabel("admin.cafe.form.nameTh")}
              <input
                name="nameTh"
                className={inputCls}
                value={get("nameTh")}
                onChange={(e) => set("nameTh", e.target.value)}
                required
              />
            </div>
            <div>
              {renderLabel("admin.cafe.form.nameEn")}
              <input
                name="nameEn"
                className={inputCls}
                value={get("nameEn")}
                onChange={(e) => set("nameEn", e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              {renderLabel("admin.cafe.form.descTh")}
              <textarea
                name="descTh"
                className={`${inputCls} min-h-16`}
                value={get("descTh")}
                onChange={(e) => set("descTh", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              {renderLabel("admin.cafe.form.descEn")}
              <textarea
                name="descEn"
                className={`${inputCls} min-h-16`}
                value={get("descEn")}
                onChange={(e) => set("descEn", e.target.value)}
              />
            </div>
            <div>
              {renderLabel("admin.cafe.form.addressTh")}
              <input
                name="addressTh"
                className={inputCls}
                value={get("addressTh")}
                onChange={(e) => set("addressTh", e.target.value)}
              />
            </div>
            <div>
              {renderLabel("admin.cafe.form.addressEn")}
              <input
                name="addressEn"
                className={inputCls}
                value={get("addressEn")}
                onChange={(e) => set("addressEn", e.target.value)}
              />
            </div>
            <div>
              {renderLabel("admin.cafe.form.phone")}
              <input
                name="phone"
                className={inputCls}
                value={get("phone")}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div>
              {renderLabel("admin.cafe.form.photo")}
              <input
                name="photo"
                className={inputCls}
                placeholder="/images/cafes/xxx.jpg"
                value={get("photo")}
                onChange={(e) => set("photo", e.target.value)}
              />
            </div>
            <div>
              {renderLabel("admin.cafe.form.openTime")}
              <input
                name="openTime"
                type="time"
                className={inputCls}
                value={get("openTime")}
                onChange={(e) => set("openTime", e.target.value)}
                required
              />
            </div>
            <div>
              {renderLabel("admin.cafe.form.closeTime")}
              <input
                name="closeTime"
                type="time"
                className={inputCls}
                value={get("closeTime")}
                onChange={(e) => set("closeTime", e.target.value)}
                required
              />
            </div>
            <div>
              {renderLabel("admin.cafe.form.lat")}
              <input
                name="lat"
                type="number"
                step="any"
                className={inputCls}
                value={get("lat")}
                onChange={(e) => set("lat", e.target.value)}
                required
              />
            </div>
            <div>
              {renderLabel("admin.cafe.form.lng")}
              <input
                name="lng"
                type="number"
                step="any"
                className={inputCls}
                value={get("lng")}
                onChange={(e) => set("lng", e.target.value)}
                required
              />
            </div>
            <div>
              {renderLabel("admin.cafe.form.baseRating")}
              <input
                name="baseRating"
                type="number"
                step="0.1"
                min="0"
                max="5"
                className={inputCls}
                value={get("baseRating")}
                onChange={(e) => set("baseRating", e.target.value)}
              />
            </div>
            <div>
              {renderLabel("admin.cafe.form.area")}
              <div className="flex gap-2">
                {AREA_ORDER.map((a) => (
                  <label
                    key={a}
                    className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-center text-xs font-semibold transition ${
                      get("area") === a
                        ? "border-coffee bg-coffee text-cream"
                        : "border-[#eee3d2] bg-sand/40 text-espresso/70 hover:bg-sand"
                    }`}
                  >
                    <input
                      type="radio"
                      name="area"
                      value={a}
                      className="sr-only"
                      onChange={() => set("area", a)}
                      checked={get("area") === a}
                    />
                    {AREA_META[a].emoji} {tr(AREA_META[a].label)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              {renderLabel("admin.cafe.form.priceRange")}
              <div className="flex gap-2">
                {[1, 2].map((p) => (
                  <label
                    key={p}
                    className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-center text-xs font-semibold transition ${
                      Number(get("priceRange")) === p
                        ? "border-coffee bg-coffee text-cream"
                        : "border-[#eee3d2] bg-sand/40 text-espresso/70 hover:bg-sand"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priceRange"
                      value={p}
                      className="sr-only"
                      onChange={() => set("priceRange", p)}
                      checked={Number(get("priceRange")) === p}
                    />
                    {p === 1 ? t("cafes.priceBudget") : t("cafes.priceMid")}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            {renderLabel("admin.cafe.form.closedDays")}
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 7 }, (_, i) => i).map((d) => {
                const active = (form.closedDays as number[]).includes(d);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() =>
                      set(
                        "closedDays",
                        active
                          ? (form.closedDays as number[]).filter((x) => x !== d)
                          : [...(form.closedDays as number[]), d]
                      )
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      active ? "bg-coffee text-cream" : "bg-sand/50 text-espresso/70 hover:bg-sand"
                    }`}
                  >
                    {tk(`day.${d}`)}
                  </button>
                );
              })}
            </div>
            <input
              type="hidden"
              name="closedDays"
              value={(form.closedDays as number[]).join(",")}
            />
          </div>

          <div className="mt-4">
            {renderLabel("admin.cafe.form.tags")}
            <div className="flex flex-wrap gap-1.5">
              {TAG_ORDER.map((tag) => {
                const active = (form.tags as string[]).includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggle("tags", tag)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      active ? "bg-coffee text-cream" : "bg-sand/50 text-espresso/70 hover:bg-sand"
                    }`}
                  >
                    {TAG_META[tag].emoji} {tr(TAG_META[tag].label)}
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="tags" value={(form.tags as string[]).join(",")} />
          </div>

          <div className="mt-4">
            {renderLabel("admin.cafe.form.lifestyleTags")}
            <div className="flex flex-wrap gap-1.5">
              {LIFESTYLE_ORDER.map((tag) => {
                const active = (form.lifestyleTags as string[]).includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggle("lifestyleTags", tag)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      active ? "bg-coffee text-cream" : "bg-sand/50 text-espresso/70 hover:bg-sand"
                    }`}
                  >
                    {LIFESTYLE_META[tag].emoji} {tr(LIFESTYLE_META[tag].label)}
                  </button>
                );
              })}
            </div>
            <input
              type="hidden"
              name="lifestyleTags"
              value={(form.lifestyleTags as string[]).join(",")}
            />
          </div>

          <div className="mt-4">
            {renderLabel("admin.cafe.form.menuHighlights")}
            <div className="flex flex-col gap-2">
              {(form.menuTh as string[]).map((_, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    name="menuTh"
                    className={inputCls}
                    value={(form.menuTh as string[])[idx] ?? ""}
                    placeholder={t("admin.cafe.form.menuTh")}
                    onChange={(e) => setMenu(idx, "menuTh", e.target.value)}
                  />
                  <input
                    name="menuEn"
                    className={inputCls}
                    value={(form.menuEn as string[])[idx] ?? ""}
                    placeholder={t("admin.cafe.form.menuEn")}
                    onChange={(e) => setMenu(idx, "menuEn", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeMenu(idx)}
                    aria-label={t("admin.cafe.form.removeMenu")}
                    className="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addMenuRow}
                className="self-start rounded-full border border-latte px-4 py-1.5 text-xs font-semibold text-coffee transition hover:bg-latte/20"
              >
                + {t("admin.cafe.form.addMenu")}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#e8dcc8] px-5 py-2 text-sm font-semibold text-espresso/80 transition hover:bg-sand"
            >
              {t("admin.cafe.form.cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-coffee px-6 py-2 text-sm font-semibold text-cream transition hover:bg-[#684a37] disabled:opacity-50"
            >
              {isPending ? "⏳" : ""} {isEdit ? t("admin.cafe.form.saveEdit") : t("admin.cafe.form.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
