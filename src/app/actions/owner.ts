"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MenuCategory } from "@/data/cafes";

export type OwnerResult = { ok: true } | { ok: false; error: string };

const CATEGORIES: MenuCategory[] = ["coffee", "drinks", "dessert", "food", "other"];

function val(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Returns the Supabase server client only when the signed-in user is either
 * the owner of `slug` or an admin. Otherwise null.
 */
async function requireOwner(slug: string): Promise<SupabaseClient | null> {
  const sb = await getSupabaseServer();
  if (!sb) return null;
  if (!/^[a-z0-9-]{1,100}$/i.test(slug)) return null;

  const { data: authData } = await sb.auth.getUser();
  if (!authData.user) return null;

  const { data: isOwner } = await sb.rpc("is_owner", { p_slug: slug });
  if (isOwner === true) return sb;

  const { data: isAdmin } = await sb.rpc("is_admin");
  if (isAdmin === true) return sb;

  return null;
}

/** Returns the supabase client for any signed-in user, or null. */
async function requireUser(): Promise<SupabaseClient | null> {
  const sb = await getSupabaseServer();
  if (!sb) return null;
  const { data: authData } = await sb.auth.getUser();
  if (!authData.user) return null;
  return sb;
}

// ============================================================
// Ownership requests
// ============================================================

export async function requestOwnership(
  slug: string,
  input: { message?: string; contact?: string }
): Promise<OwnerResult> {
  const sb = await requireUser();
  if (!sb) return { ok: false, error: "not_authorized" };
  if (!/^[a-z0-9-]{1,100}$/i.test(slug)) return { ok: false, error: "invalid" };

  const { data: authData } = await sb.auth.getUser();
  const userId = authData.user?.id;

  const message = input.message?.trim() ?? "";
  const contact = input.contact?.trim() ?? "";
  if (message.length > 500) return { ok: false, error: "invalid" };
  if (contact.length > 120) return { ok: false, error: "invalid" };

  const { data: ownerData } = await sb.rpc("is_owner", { p_slug: slug });
  if (ownerData === true) return { ok: false, error: "already_owner" };

  const { error } = await sb.from("owner_requests").insert({
    cafe_slug: slug,
    user_id: userId,
    message: message || null,
    contact: contact || null,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "already_requested" };
    console.error("requestOwnership failed:", error);
    return { ok: false, error: "failed" };
  }
  return { ok: true };
}

// ============================================================
// Menu management (owner must manage the cafe)
// ============================================================

interface MenuInput {
  nameTh: string;
  nameEn: string;
  price: number | null;
  category: MenuCategory;
  isAvailable: boolean;
}

function parseMenu(formData: FormData): MenuInput | { error: string } {
  const nameTh = val(formData, "nameTh");
  const nameEn = val(formData, "nameEn");
  const category = val(formData, "category") as MenuCategory;
  const rawPrice = val(formData, "price");
  const price = rawPrice === "" ? null : Number(rawPrice);

  if (!nameTh || nameTh.length > 200) return { error: "invalid" };
  if (nameEn.length > 200) return { error: "invalid" };
  if (!CATEGORIES.includes(category)) return { error: "invalid" };
  if (price !== null && (!Number.isFinite(price) || price < 0)) return { error: "invalid" };

  return { nameTh, nameEn, price, category, isAvailable: true };
}

export async function addMenuItem(slug: string, formData: FormData): Promise<OwnerResult> {
  const sb = await requireOwner(slug);
  if (!sb) return { ok: false, error: "not_authorized" };

  const parsed = parseMenu(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { count, error: countErr } = await sb
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("cafe_slug", slug);
  if (countErr) {
    console.error("addMenuItem count failed:", countErr);
    return { ok: false, error: "failed" };
  }

  const { error } = await sb.from("menu_items").insert({
    cafe_slug: slug,
    name_th: parsed.nameTh,
    name_en: parsed.nameEn || null,
    price: parsed.price,
    category: parsed.category,
    is_available: parsed.isAvailable,
    sort_order: count ?? 0,
  });

  if (error) {
    console.error("addMenuItem failed:", error);
    return { ok: false, error: "failed" };
  }
  revalidatePath(`/cafes/${slug}`);
  revalidatePath("/profile");
  return { ok: true };
}

export async function updateMenuItem(id: string, formData: FormData): Promise<OwnerResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "invalid" };

  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "not_authorized" };

  const { data: item } = await sb.from("menu_items").select("cafe_slug").eq("id", id).single();
  if (!item) return { ok: false, error: "invalid" };
  const slug = item.cafe_slug as string;

  // Verify the caller may manage this cafe.
  const authed = await requireOwner(slug);
  if (!authed) return { ok: false, error: "not_authorized" };

  const parsed = parseMenu(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { error } = await sb.from("menu_items").update({
    name_th: parsed.nameTh,
    name_en: parsed.nameEn || null,
    price: parsed.price,
    category: parsed.category,
  }).eq("id", id);

  if (error) {
    console.error("updateMenuItem failed:", error);
    return { ok: false, error: "failed" };
  }
  revalidatePath(`/cafes/${slug}`);
  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteMenuItem(id: string): Promise<OwnerResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "invalid" };

  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "not_authorized" };

  const { data: item } = await sb.from("menu_items").select("cafe_slug").eq("id", id).single();
  if (!item) return { ok: false, error: "invalid" };
  const slug = item.cafe_slug as string;

  const authed = await requireOwner(slug);
  if (!authed) return { ok: false, error: "not_authorized" };

  const { error } = await sb.from("menu_items").delete().eq("id", id);
  if (error) {
    console.error("deleteMenuItem failed:", error);
    return { ok: false, error: "failed" };
  }
  revalidatePath(`/cafes/${slug}`);
  revalidatePath("/profile");
  return { ok: true };
}

export async function toggleMenuItem(id: string, available: boolean): Promise<OwnerResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "invalid" };

  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "not_authorized" };

  const { data: item } = await sb.from("menu_items").select("cafe_slug").eq("id", id).single();
  if (!item) return { ok: false, error: "invalid" };
  const slug = item.cafe_slug as string;

  const authed = await requireOwner(slug);
  if (!authed) return { ok: false, error: "not_authorized" };

  const { error } = await sb
    .from("menu_items")
    .update({ is_available: available })
    .eq("id", id);
  if (error) {
    console.error("toggleMenuItem failed:", error);
    return { ok: false, error: "failed" };
  }
  revalidatePath(`/cafes/${slug}`);
  revalidatePath("/profile");
  return { ok: true };
}

// ============================================================
// Lookups
// ============================================================

/** Cafes owned (as owner or via admin) by the current user, with menus. */
export async function getMyManageableCafes(): Promise<{ slug: string }[]> {
  const sb = await getSupabaseServer();
  if (!sb) return [];
  const { data: authData } = await sb.auth.getUser();
  if (!authData.user) return [];

  const { data: isAdmin } = await sb.rpc("is_admin");

  let rows: { slug: string; owner_id: string | null }[] = [];
  if (isAdmin === true) {
    const { data } = await sb.from("cafes").select("slug, owner_id");
    rows = data ?? [];
  } else {
    const { data } = await sb.rpc("get_my_cafes");
    rows = (data ?? []).map(
      (r: { slug?: string; owner_id?: string | null }) => ({
        slug: (r.slug ?? "") as string,
        owner_id: (r.owner_id ?? null) as string | null,
      })
    );
  }

  return rows.map((r) => ({ slug: r.slug }));
}

// ============================================================
// <form action> wrappers for useActionState
// ============================================================

export async function addMenuItemFormAction(
  _prev: OwnerResult | undefined,
  formData: FormData
): Promise<OwnerResult> {
  return addMenuItem(val(formData, "slug"), formData);
}

export async function updateMenuItemFormAction(
  _prev: OwnerResult | undefined,
  formData: FormData
): Promise<OwnerResult> {
  return updateMenuItem(val(formData, "id"), formData);
}

export async function deleteMenuItemFormAction(
  _prev: OwnerResult | undefined,
  formData: FormData
): Promise<OwnerResult> {
  return deleteMenuItem(val(formData, "id"));
}

export async function toggleMenuItemFormAction(
  _prev: OwnerResult | undefined,
  formData: FormData
): Promise<OwnerResult> {
  return toggleMenuItem(val(formData, "id"), formData.get("available") === "1");
}
