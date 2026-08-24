"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getSupabase, type ReviewRow } from "@/lib/supabase";
import { CAFES } from "@/data/cafes";
import { checkReviewRateLimit } from "@/lib/rate-limit";

export type ReviewResult =
  | { ok: true; data: ReviewRow }
  | { ok: false; error: string };

export async function submitReview(formData: {
  slug: string;
  name: string;
  rating: number;
  comment: string;
}): Promise<ReviewResult> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, error: "Database not configured" };
  }

  // Rate limit by client IP (single-instance in-memory limiter)
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip")?.trim() ||
    "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");
  if (!checkReviewRateLimit(ipHash).allowed) {
    return { ok: false, error: "rate_limited" };
  }

  const { slug, name, rating, comment } = formData;
  
  // Server-side validation
  const cafe = CAFES.find(c => c.slug === slug);
  if (!cafe) return { ok: false, error: "Invalid cafe" };

  const safeName = name.trim();
  const safeComment = comment.trim();

  if (!safeName || safeName.length > 60) {
    return { ok: false, error: "Name must be 1-60 characters" };
  }
  
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Invalid rating" };
  }
  
  if (safeComment.length > 500) {
    return { ok: false, error: "Comment too long (max 500)" };
  }

  const { data, error } = await sb
    .from("reviews")
    .insert({
      cafe_slug: slug,
      author_name: safeName,
      rating,
      comment: safeComment || null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("submitReview failed:", error);
    return { ok: false, error: "Failed to submit review" };
  }

  return { ok: true, data };
}
