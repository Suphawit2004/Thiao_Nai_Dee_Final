import type { Cafe } from "@/data/cafes";
import { CAFES } from "@/data/cafes";
import { fetchCafesWithMenus, mergeCafes } from "@/data/cafes-data";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * Server-side cafe list with menu items.
 * Merges the static curated list with database rows — curated cafes always
 * show (even without a seeded DB) and DB-only (newly-added) cafes appear too.
 * Falls back to just the static list when no database is configured.
 */
export async function getCafes(): Promise<Cafe[]> {
  const sb = await getSupabaseServer();
  if (!sb) return mergeCafes(CAFES, []);
  const cafes = await fetchCafesWithMenus(sb);
  return mergeCafes(CAFES, cafes);
}

export async function getCafe(slug: string): Promise<Cafe | undefined> {
  const cafes = await getCafes();
  return cafes.find((c) => c.slug === slug);
}
