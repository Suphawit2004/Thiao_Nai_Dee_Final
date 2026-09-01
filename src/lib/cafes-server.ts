import type { Cafe } from "@/data/cafes";
import { CAFES } from "@/data/cafes";
import { fetchCafesWithMenus } from "@/data/cafes-data";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * Server-side cafe list with menu items.
 * Fetches from Supabase when configured; otherwise falls back to the
 * static curated data so the site still renders without a database.
 */
export async function getCafes(): Promise<Cafe[]> {
  const sb = await getSupabaseServer();
  if (!sb) return CAFES;
  const cafes = await fetchCafesWithMenus(sb);
  return cafes.length > 0 ? cafes : CAFES;
}

export async function getCafe(slug: string): Promise<Cafe | undefined> {
  const cafes = await getCafes();
  return cafes.find((c) => c.slug === slug);
}
