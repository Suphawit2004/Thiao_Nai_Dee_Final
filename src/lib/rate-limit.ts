/**
 * In-memory sliding-window rate limiter.
 *
 * State lives in the current process only: fine for a single small instance,
 * resets on deploy, and does not protect across horizontally scaled replicas.
 */

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const MINUTE = 60_000;

export const REVIEW_IP_LIMIT: RateLimitConfig = { limit: 3, windowMs: 15 * MINUTE };
export const REVIEW_GLOBAL_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60 * MINUTE };

/** Pure sliding-window decision over a list of past hit timestamps. */
export function slidingWindowAllow(
  hits: readonly number[],
  now: number,
  cfg: RateLimitConfig
): { allowed: boolean; next: number[] } {
  const fresh = hits.filter((t) => now - t < cfg.windowMs);
  if (fresh.length >= cfg.limit) return { allowed: false, next: fresh };
  fresh.push(now);
  return { allowed: true, next: fresh };
}

const perIpHits = new Map<string, number[]>();
let globalHits: number[] = [];

function retryAfterSec(oldestHit: number, now: number, cfg: RateLimitConfig): number {
  return Math.max(1, Math.ceil((oldestHit + cfg.windowMs - now) / 1000));
}

function prune(map: Map<string, number[]>, now: number) {
  if (map.size <= 10_000) return;
  for (const [key, hits] of map) {
    const fresh = hits.filter((t) => now - t < REVIEW_IP_LIMIT.windowMs);
    if (fresh.length === 0) map.delete(key);
    else map.set(key, fresh);
  }
}

export function checkReviewRateLimit(
  ipHash: string,
  now: number = Date.now()
): { allowed: boolean; retryAfterSec?: number } {
  const g = slidingWindowAllow(globalHits, now, REVIEW_GLOBAL_LIMIT);
  if (!g.allowed) {
    globalHits = g.next;
    return { allowed: false, retryAfterSec: retryAfterSec(g.next[0], now, REVIEW_GLOBAL_LIMIT) };
  }

  const p = slidingWindowAllow(perIpHits.get(ipHash) ?? [], now, REVIEW_IP_LIMIT);
  if (!p.allowed) {
    perIpHits.set(ipHash, p.next);
    return { allowed: false, retryAfterSec: retryAfterSec(p.next[0], now, REVIEW_IP_LIMIT) };
  }

  globalHits = g.next;
  perIpHits.set(ipHash, p.next);
  prune(perIpHits, now);
  return { allowed: true };
}
