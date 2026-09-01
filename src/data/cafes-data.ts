import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cafe, CafeTag, LocalText, MenuCategory, MenuItem } from "./cafes";
import type { CafeRow } from "./cafe-db";
import { rowToCafe } from "./cafe-db";

/** Fallback copy shown for newly-added cafes that have no description yet. */
export const DEFAULT_CAFE_DESCRIPTION: LocalText = {
  th: "คาเฟ่ในจังหวัดพะเยา",
  en: "A cafe in Phayao province",
};

/** Neutral tag added to newly-added cafes so their cards are never tagless. */
export const DEFAULT_CAFE_TAG: CafeTag = "chill";

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
    logSupabaseError("fetchCafesWithMenus (cafes) failed", cafesRes.error);
    return [];
  }
  if (menusRes.error) {
    logSupabaseError("fetchCafesWithMenus (menus) failed", menusRes.error);
    return attachMenus(cafesRes.data ?? [], []);
  }

  return attachMenus(cafesRes.data ?? [], menusRes.data ?? []);
}

/** Log a Supabase error in a way that keeps message/code/details visible. */
function logSupabaseError(context: string, error: unknown): void {
  const e = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown } | null;
  console.error(context, {
    message: e?.message ?? "unknown",
    code: e?.code ?? undefined,
    details: e?.details ?? undefined,
    hint: e?.hint ?? undefined,
  });
}

function textNonEmpty(t: LocalText): boolean {
  return t.th.trim().length > 0 || t.en.trim().length > 0;
}

function hoursUnknown(c: { openTime: string; closeTime: string }): boolean {
  return c.openTime === "00:00" && c.closeTime === "00:00";
}

/** Fill graceful fallbacks so sparse DB rows (newly-added cafes) still render well. */
export function normalizeSparseCafe(cafe: Cafe): Cafe {
  const needsDescription = !textNonEmpty(cafe.description);
  const needsTag = cafe.tags.length === 0;
  if (!needsDescription && !needsTag) return cafe;
  return {
    ...cafe,
    ...(needsDescription && { description: DEFAULT_CAFE_DESCRIPTION }),
    ...(needsTag && { tags: [DEFAULT_CAFE_TAG] }),
  };
}

/**
 * Merge the static curated list with database rows, returning a single union.
 *
 * Both sources are kept: curated cafes are always present (even when the DB is
 * empty or hasn't been seeded), and any cafes that exist only in the DB appear
 * too. For a cafe present in both, the DB is authoritative for editable fields,
 * but empty/sparse DB values (e.g. a suggestion-promoted row) never clobber the
 * richer curated copy; only non-empty DB data is overlaid. Unknown hours in the
 * DB ("00:00") are ignored so the curated opening times are kept.
 *
 * Note: dbCafes should come from an active-only fetch, so deactivated rows are
 * excluded upstream.
 */
export function mergeCafes(staticCafes: Cafe[], dbCafes: Cafe[]): Cafe[] {
  const seen = new Set<string>();

  const merged: Cafe[] = [];
  for (const c of staticCafes) {
    const db = dbCafes.find((d) => d.slug === c.slug);
    if (db) {
      seen.add(c.slug);
      merged.push(overlayCafe(c, db));
    } else {
      merged.push(c);
    }
  }
  for (const db of dbCafes) {
    if (!seen.has(db.slug)) {
      merged.push(db);
    }
  }
  return merged.map(normalizeSparseCafe);
}

function overlayCafe(base: Cafe, db: Cafe): Cafe {
  const hoursKnown = !hoursUnknown(db);
  return {
    slug: db.slug,
    name: textNonEmpty(db.name) ? db.name : base.name,
    description: textNonEmpty(db.description) ? db.description : base.description,
    address: textNonEmpty(db.address) ? db.address : base.address,
    phone: db.phone ?? base.phone,
    openTime: hoursKnown ? db.openTime : base.openTime,
    closeTime: hoursKnown ? db.closeTime : base.closeTime,
    closedDays: db.closedDays ?? base.closedDays,
    priceRange: db.priceRange,
    tags: db.tags.length > 0 ? db.tags : base.tags,
    lifestyleTags: db.lifestyleTags.length > 0 ? db.lifestyleTags : base.lifestyleTags,
    area: db.area,
    lat: db.lat,
    lng: db.lng,
    photo: db.photo ?? base.photo,
    menuHighlights: db.menuHighlights.length > 0 ? db.menuHighlights : base.menuHighlights,
    menuItems: db.menuItems ?? base.menuItems,
    baseRating: db.baseRating,
  };
}
