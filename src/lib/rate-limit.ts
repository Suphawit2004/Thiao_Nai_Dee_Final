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

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
}

const MINUTE = 60_000;

export const REVIEW_IP_LIMIT: RateLimitConfig = { limit: 3, windowMs: 15 * MINUTE };
export const REVIEW_GLOBAL_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60 * MINUTE };
export const SUGGESTION_IP_LIMIT: RateLimitConfig = { limit: 3, windowMs: 60 * MINUTE };
export const SUGGESTION_GLOBAL_LIMIT: RateLimitConfig = { limit: 20, windowMs: 60 * MINUTE };
export const REPORT_IP_LIMIT: RateLimitConfig = { limit: 5, windowMs: 15 * MINUTE };
export const REPORT_GLOBAL_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60 * MINUTE };

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

function retryAfterSec(oldestHit: number, now: number, cfg: RateLimitConfig): number {
  return Math.max(1, Math.ceil((oldestHit + cfg.windowMs - now) / 1000));
}

function prune(map: Map<string, number[]>, now: number, windowMs: number) {
  if (map.size <= 10_000) return;
  for (const [key, hits] of map) {
    const fresh = hits.filter((t) => now - t < windowMs);
    if (fresh.length === 0) map.delete(key);
    else map.set(key, fresh);
  }
}

/** Independent per-key + global limiter instance (one per protected action). */
export function createRateLimiter(
  ipCfg: RateLimitConfig,
  globalCfg: RateLimitConfig
): (key: string, now?: number) => RateLimitResult {
  const perKeyHits = new Map<string, number[]>();
  let globalHits: number[] = [];

  return function check(key: string, now: number = Date.now()): RateLimitResult {
    const g = slidingWindowAllow(globalHits, now, globalCfg);
    if (!g.allowed) {
      globalHits = g.next;
      return { allowed: false, retryAfterSec: retryAfterSec(g.next[0], now, globalCfg) };
    }

    const p = slidingWindowAllow(perKeyHits.get(key) ?? [], now, ipCfg);
    if (!p.allowed) {
      perKeyHits.set(key, p.next);
      return { allowed: false, retryAfterSec: retryAfterSec(p.next[0], now, ipCfg) };
    }

    globalHits = g.next;
    perKeyHits.set(key, p.next);
    prune(perKeyHits, now, ipCfg.windowMs);
    return { allowed: true };
  };
}

export const checkReviewRateLimit = createRateLimiter(REVIEW_IP_LIMIT, REVIEW_GLOBAL_LIMIT);
export const checkSuggestionRateLimit = createRateLimiter(
  SUGGESTION_IP_LIMIT,
  SUGGESTION_GLOBAL_LIMIT
);
export const checkReportRateLimit = createRateLimiter(REPORT_IP_LIMIT, REPORT_GLOBAL_LIMIT);
