import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cafe, LocalText, MenuCategory, MenuItem } from "./cafes";
import type { CafeRow } from "./cafe-db";
import { rowToCafe } from "./cafe-db";

export interface MenuRow {
  id: string;
  cafe_slug: string;
  name_th: string;
  name_en: string | null;
  price: number | null;
  category: MenuCategory;
  is_available: boolean;
  sort_order: number;
}

function toLocal(th?: string | null, en?: string | null): LocalText {
  return { th: th ?? "", en: en ?? "" };
}

export function rowToMenu(raw: MenuRow): MenuItem {
  return {
    id: raw.id,
    name: toLocal(raw.name_th, raw.name_en),
    price: raw.price,
    category: raw.category,
    isAvailable: raw.is_available,
    sortOrder: raw.sort_order,
  };
}

/** Attach menu items (already mapped) to cafe rows. */
export function attachMenus<T extends CafeRow>(rows: T[], menus: MenuRow[]): Cafe[] {
  const byCafe = new Map<string, MenuItem[]>();
  for (const m of menus) {
    const list = byCafe.get(m.cafe_slug) ?? [];
    list.push(rowToMenu(m));
    byCafe.set(m.cafe_slug, list);
  }
  return rows.map((row) => {
    const cafe = rowToCafe(row);
    const items = (byCafe.get(row.slug) ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
    return { ...cafe, menuItems: items.length > 0 ? items : undefined };
  });
}

/**
 * Fetch all active cafes together with their menu items using a given
 * Supabase client (works for both browser and server clients — the public
 * `cafes` and `menu_items` tables are readable by everyone).
 */
export async function fetchCafesWithMenus(
  client: SupabaseClient,
  opts: { includeInactive?: boolean } = {}
): Promise<Cafe[]> {
  const { includeInactive = false } = opts;

  let cafesQuery = client.from("cafes").select("*");
  if (!includeInactive) cafesQuery = cafesQuery.eq("is_active", true);
  const cafesRes = await cafesQuery;

  const menusRes = await client
    .from("menu_items")
    .select("*")
    .order("sort_order", { ascending: true });

  if (cafesRes.error) {
    console.error("fetchCafesWithMenus failed:", cafesRes.error);
    return [];
  }
  if (menusRes.error) {
    console.error("fetchCafesWithMenus (menus) failed:", menusRes.error);
    return attachMenus(cafesRes.data ?? [], []);
  }

  return attachMenus(cafesRes.data ?? [], menusRes.data ?? []);
}
