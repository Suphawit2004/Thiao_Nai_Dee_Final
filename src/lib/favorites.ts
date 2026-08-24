const LS_KEY = "tnl-favs";

export function readLocalFavs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string").slice(0, 200);
  } catch {
    return [];
  }
}

export function writeLocalFavs(slugs: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(slugs.slice(0, 200)));
}