const LS_KEY = "tnl-favs";
const MAX_SLUG_LENGTH = 100;

export function readLocalFavs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const slugs = parsed.filter(
      (v): v is string => typeof v === "string" && v.length > 0 && v.length <= MAX_SLUG_LENGTH
    );
    // Dedupe: duplicates would produce duplicate cards/keys and a failing upsert.
    return [...new Set(slugs)].slice(0, 200);
  } catch {
    return [];
  }
}

export function writeLocalFavs(slugs: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(slugs.slice(0, 200)));
}