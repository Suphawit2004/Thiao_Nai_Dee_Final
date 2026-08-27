import { getSupabaseServer } from "@/lib/supabase-server";

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
}

export const REVIEW_IP_LIMIT: RateLimitConfig = { limit: 3, windowSeconds: 15 * 60 };
export const REVIEW_GLOBAL_LIMIT: RateLimitConfig = { limit: 30, windowSeconds: 60 * 60 };
export const SUGGESTION_IP_LIMIT: RateLimitConfig = { limit: 3, windowSeconds: 60 * 60 };
export const SUGGESTION_GLOBAL_LIMIT: RateLimitConfig = { limit: 20, windowSeconds: 60 * 60 };
export const REPORT_IP_LIMIT: RateLimitConfig = { limit: 5, windowSeconds: 15 * 60 };
export const REPORT_GLOBAL_LIMIT: RateLimitConfig = { limit: 30, windowSeconds: 60 * 60 };

function makeKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}

export async function checkRateLimit(
  key: string,
  cfg: RateLimitConfig
): Promise<RateLimitResult> {
  const sb = await getSupabaseServer();
  if (!sb) {
    return { allowed: true };
  }

  const allowed = await sb.rpc("check_rate_limit", {
    p_key: key,
    p_limit: cfg.limit,
    p_window_seconds: cfg.windowSeconds,
  });

  if (allowed.error) {
    console.error("check_rate_limit RPC error:", allowed.error);
    return { allowed: true };
  }

  if (!allowed.data) {
    return { allowed: false, retryAfterSec: cfg.windowSeconds };
  }

  return { allowed: true };
}

export function createRateLimiter(
  ipCfg: RateLimitConfig,
  globalCfg: RateLimitConfig,
  actionPrefix: string
) {
  return async function check(key: string): Promise<RateLimitResult> {
    const ipKey = makeKey(`${actionPrefix}:ip`, key);
    const globalKey = makeKey(`${actionPrefix}:global`, "all");

    const ipResult = await checkRateLimit(ipKey, ipCfg);
    if (!ipResult.allowed) return ipResult;

    const globalResult = await checkRateLimit(globalKey, globalCfg);
    if (!globalResult.allowed) return globalResult;

    return { allowed: true };
  };
}

export const checkReviewRateLimit = createRateLimiter(
  REVIEW_IP_LIMIT,
  REVIEW_GLOBAL_LIMIT,
  "review"
);

export const checkSuggestionRateLimit = createRateLimiter(
  SUGGESTION_IP_LIMIT,
  SUGGESTION_GLOBAL_LIMIT,
  "suggestion"
);

export const checkReportRateLimit = createRateLimiter(
  REPORT_IP_LIMIT,
  REPORT_GLOBAL_LIMIT,
  "report"
);