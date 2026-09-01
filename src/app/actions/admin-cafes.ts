"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type AdminResult } from "./admin";
import type { CafeRow } from "@/data/cafe-db";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function val(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function boolArr(formData: FormData, key: string): string[] {
  const parts: string[] = [];
  for (const x of formData.getAll(key)) {
    for (const p of String(x).split(",")) {
      const v = p.trim();
      if (v) parts.push(v);
    }
  }
  return parts;
}

function numArr(formData: FormData, key: string): number[] {
  return boolArr(formData, key)
    .map((x) => Number(x))
    .filter(Number.isInteger);
}

function menuHighlights(formData: FormData): { th: string; en: string }[] {
  const th = formData.getAll("menuTh").map((x) => String(x).trim());
  const en = formData.getAll("menuEn").map((x) => String(x).trim());
  const out: { th: string; en: string }[] = [];
  for (let i = 0; i < th.length; i++) {
    if (!th[i] && !en[i]) continue;
    out.push({ th: th[i] ?? "", en: en[i] ?? "" });
  }
  return out;
}

function parseRow(formData: FormData): Partial<CafeRow> | { error: string } {
  const name_th = val(formData, "nameTh");
  const name_en = val(formData, "nameEn");
  const open_time = val(formData, "openTime");
  const close_time = val(formData, "closeTime");
  const area = val(formData, "area");
  const lat = Number(val(formData, "lat"));
  const lng = Number(val(formData, "lng"));
  const price_range = Number(val(formData, "priceRange"));
  const base_rating = Number(val(formData, "baseRating") || "4.0");

  if (!name_th) return { error: "Missing name (th)" };
  if (!name_en) return { error: "Missing name (en)" };
  if (!/^\d{2}:\d{2}$/.test(open_time) || !/^\d{2}:\d{2}$/.test(close_time)) {
    return { error: "Invalid open/close time" };
  }
  if (area !== "lakeside" && area !== "maeka-uni") return { error: "Invalid area" };
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: "Invalid lat" };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { error: "Invalid lng" };
  if (price_range !== 1 && price_range !== 2) return { error: "Invalid price range" };
  if (!Number.isFinite(base_rating) || base_rating < 0 || base_rating > 5) {
    return { error: "Invalid base rating" };
  }

  const tags = boolArr(formData, "tags");
  const lifestyle_tags = boolArr(formData, "lifestyleTags");
  const closed_days = numArr(formData, "closedDays");

  return {
    name_th,
    name_en,
    description_th: val(formData, "descTh"),
    description_en: val(formData, "descEn"),
    address_th: val(formData, "addressTh"),
    address_en: val(formData, "addressEn"),
    phone: val(formData, "phone") || null,
    open_time,
    close_time,
    closed_days,
    price_range: price_range as 1 | 2,
    tags,
    lifestyle_tags,
    area: area as "lakeside" | "maeka-uni",
    lat,
    lng,
    photo: val(formData, "photo") || null,
    menu_highlights: menuHighlights(formData),
    base_rating,
    is_active: true,
  };
}

export async function createCafe(formData: FormData): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };

  const row = parseRow(formData);
  if ("error" in row) return { ok: false, error: row.error };

  const slug = slugify(val(formData, "slug") || row.name_en || "");
  if (!slug) return { ok: false, error: "Invalid slug" };

  const { error } = await sb.from("cafes").insert({ ...row, slug });
  if (error) {
    console.error("createCafe failed:", error);
    if (error.code === "23505") return { ok: false, error: "Slug already exists" };
    return { ok: false, error: "Create failed" };
  }
  revalidatePath("/admin");
  revalidatePath("/cafes");
  revalidatePath("/");
  return { ok: true };
}

export async function updateCafe(slug: string, formData: FormData): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };
  if (!/^[a-z0-9-]{1,100}$/i.test(slug)) return { ok: false, error: "Invalid id" };

  const row = parseRow(formData);
  if ("error" in row) return { ok: false, error: row.error };

  const { error } = await sb.from("cafes").update(row).eq("slug", slug);
  if (error) {
    console.error("updateCafe failed:", error);
    return { ok: false, error: "Update failed" };
  }
  revalidatePath("/admin");
  revalidatePath("/cafes");
  revalidatePath(`/cafes/${slug}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCafe(slug: string): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };
  if (!/^[a-z0-9-]{1,100}$/i.test(slug)) return { ok: false, error: "Invalid id" };

  // Check for reviews — refuse hard delete if any exist
  const { count } = await sb
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("cafe_slug", slug);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Cafe has reviews" };
  }

  const { error } = await sb.from("cafes").delete().eq("slug", slug);
  if (error) {
    console.error("deleteCafe failed:", error);
    return { ok: false, error: "Delete failed" };
  }
  revalidatePath("/admin");
  revalidatePath("/cafes");
  revalidatePath("/");
  return { ok: true };
}

export async function setCafeActive(slug: string, isActive: boolean): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };
  if (!/^[a-z0-9-]{1,100}$/i.test(slug)) return { ok: false, error: "Invalid id" };

  const { error } = await sb.from("cafes").update({ is_active: isActive }).eq("slug", slug);
  if (error) {
    console.error("setCafeActive failed:", error);
    return { ok: false, error: "Update failed" };
  }
  revalidatePath("/admin");
  revalidatePath("/cafes");
  revalidatePath(`/cafes/${slug}`);
  revalidatePath("/");
  return { ok: true };
}

/** Build the cafes-table row for a cafe_suggestion. */
function suggestionRow(suggestion: SuggestionRow) {
  const slug = slugify(suggestion.name);
  return {
    slug,
    name_th: suggestion.name,
    name_en: suggestion.name,
    description_th: suggestion.note ?? "",
    description_en: suggestion.note ?? "",
    address_th: suggestion.address ?? "",
    address_en: suggestion.address ?? "",
    open_time: suggestion.open_time ?? "00:00",
    close_time: suggestion.close_time ?? "00:00",
    closed_days: [] as number[],
    price_range: (suggestion.price_range ?? 2) as 1 | 2,
    tags: [] as string[],
    lifestyle_tags: [] as string[],
    area: "lakeside" as const,
    lat: suggestion.lat,
    lng: suggestion.lng,
    phone: suggestion.contact ?? null,
    photo: suggestion.photo_url ?? null,
    menu_highlights: [] as { th: string; en: string }[],
    base_rating: 4.0,
    is_active: true,
  };
}

interface SuggestionRow {
  name: string;
  note?: string | null;
  address?: string | null;
  open_time?: string | null;
  close_time?: string | null;
  price_range?: number | null;
  lat: number;
  lng: number;
  contact?: string | null;
  photo_url?: string | null;
}

/** Insert an approved suggestion into the cafes table. Shared by approve + manual promote. */
export async function insertSuggestionAsCafe(
  sb: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>,
  suggestion: SuggestionRow
): Promise<AdminResult> {
  const row = suggestionRow(suggestion);
  const { error } = await sb.from("cafes").insert(row);
  if (error) {
    console.error("insertSuggestionAsCafe failed:", error);
    if (error.code === "23505") return { ok: false, error: "Cafe already exists" };
    return { ok: false, error: "Create failed" };
  }
  revalidatePath("/admin");
  revalidatePath("/cafes");
  revalidatePath(`/cafes/${row.slug}`);
  revalidatePath("/");
  return { ok: true };
}

// ---- <form action> wrappers for useActionState -----------------------------

export async function createCafeFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  return createCafe(formData);
}

export async function updateCafeFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  return updateCafe(val(formData, "slug"), formData);
}

export async function deleteCafeFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  return deleteCafe(val(formData, "slug"));
}

export async function setCafeActiveFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  return setCafeActive(val(formData, "slug"), formData.get("active") === "1");
}
