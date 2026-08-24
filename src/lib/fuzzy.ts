function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Tolerant name matching: exact substring > whole-word prefix > subsequence.
 * Returns a relevance score (higher = better) or null when there is no match.
 */
export function fuzzyMatch(text: string, query: string): number | null {
  const h = norm(text);
  const n = norm(query);
  if (!n) return null;

  const idx = h.indexOf(n);
  if (idx >= 0) return 100 - Math.min(idx, 20);

  // Every query token is a prefix of some token in the text ("บ้านบาน" ~ "บ้านบานน์ ริมกว๊าน")
  const hayTokens = h.split(" ");
  const queryTokens = n.split(" ");
  if (queryTokens.length > 0 && queryTokens.every((qt) => hayTokens.some((wt) => wt.startsWith(qt)))) {
    return 80;
  }

  // Characters appear in order ("สิปปิน" ~ "sippin"), only for meaningful queries
  if (n.length >= 3) {
    let i = 0;
    for (const ch of h) {
      if (ch === n[i]) i += 1;
      if (i === n.length) return 55;
    }
  }

  return null;
}