import { describe, expect, it } from "vitest";
import {
  REPORT_IP_LIMIT,
  REVIEW_GLOBAL_LIMIT,
  REVIEW_IP_LIMIT,
  SUGGESTION_IP_LIMIT,
  checkReportRateLimit,
  checkReviewRateLimit,
  checkSuggestionRateLimit,
  createRateLimiter,
  slidingWindowAllow,
} from "@/lib/rate-limit";

const T0 = 1_000_000;

describe("slidingWindowAllow", () => {
  it("allows hits below the limit and blocks at the limit", () => {
    const cfg = { limit: 3, windowMs: 1000 };
    let hits: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      const r = slidingWindowAllow(hits, T0 + i * 10, cfg);
      expect(r.allowed).toBe(true);
      hits = r.next;
    }
    expect(slidingWindowAllow(hits, T0 + 100, cfg).allowed).toBe(false);
  });

  it("forgets hits once the window has passed", () => {
    const cfg = { limit: 2, windowMs: 100 };
    let hits: number[] = [];
    for (let i = 0; i < 2; i += 1) hits = slidingWindowAllow(hits, T0 + i * 10, cfg).next;
    expect(slidingWindowAllow(hits, T0 + 50, cfg).allowed).toBe(false);
    // both hits are now older than the window
    expect(slidingWindowAllow(hits, T0 + 150, cfg).allowed).toBe(true);
  });

  it("only counts hits inside the window when deciding", () => {
    const cfg = { limit: 3, windowMs: 100 };
    const hits = [T0 - 500, T0, T0 + 10];
    const r = slidingWindowAllow(hits, T0 + 20, cfg);
    expect(r.allowed).toBe(true);
    expect(r.next).toEqual([T0, T0 + 10, T0 + 20]);
  });
});

describe("checkReviewRateLimit", () => {
  it("allows a few reviews per IP then blocks with a retry hint", () => {
    let now = T0;
    for (let i = 0; i < REVIEW_IP_LIMIT.limit; i += 1) {
      expect(checkReviewRateLimit("ip-a", now).allowed).toBe(true);
      now += 60_000;
    }
    const blocked = checkReviewRateLimit("ip-a", now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);

    // A different IP is unaffected
    expect(checkReviewRateLimit("ip-b", now).allowed).toBe(true);
  });

  it("unblocks the IP after the window passes", () => {
    let now = T0;
    for (let i = 0; i < REVIEW_IP_LIMIT.limit; i += 1) {
      checkReviewRateLimit("ip-c", now);
      now += 1000;
    }
    now += REVIEW_IP_LIMIT.windowMs;
    expect(checkReviewRateLimit("ip-c", now).allowed).toBe(true);
  });

  it("enforces the global fuse across IPs", () => {
    // Far beyond every earlier test's hits so the module-level window starts clean
    let now = T0 + 100 * REVIEW_GLOBAL_LIMIT.windowMs;
    const tStart = now;
    let accepted = 0;
    while (now < tStart + 1000 && accepted <= REVIEW_GLOBAL_LIMIT.limit) {
      if (checkReviewRateLimit(`fuse-${accepted}`, now).allowed) accepted += 1;
      now += 10;
    }
    expect(accepted).toBe(REVIEW_GLOBAL_LIMIT.limit);
  });
});

describe("createRateLimiter / per-action limiters", () => {
  it("keeps limiter instances independent", () => {
    const a = createRateLimiter({ limit: 1, windowMs: 1000 }, { limit: 10, windowMs: 1000 });
    const b = createRateLimiter({ limit: 1, windowMs: 1000 }, { limit: 10, windowMs: 1000 });
    expect(a("k", T0).allowed).toBe(true);
    expect(a("k", T0 + 1).allowed).toBe(false);
    expect(b("k", T0 + 2).allowed).toBe(true);
  });

  it("applies each action's own per-IP limits", () => {
    const now = T0 + 200 * REVIEW_GLOBAL_LIMIT.windowMs;

    for (let i = 0; i < SUGGESTION_IP_LIMIT.limit; i += 1) {
      expect(checkSuggestionRateLimit("sg-ip", now + i).allowed).toBe(true);
    }
    expect(checkSuggestionRateLimit("sg-ip", now + 100).allowed).toBe(false);

    for (let i = 0; i < REPORT_IP_LIMIT.limit; i += 1) {
      expect(checkReportRateLimit("rp-ip", now + i).allowed).toBe(true);
    }
    expect(checkReportRateLimit("rp-ip", now + 100).allowed).toBe(false);
  });
});
