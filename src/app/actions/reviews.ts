"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { checkReviewRateLimit } from "@/lib/rate-limit-supabase";
import { resolveClientIp } from "@/lib/client-ip";
import { getSupabaseServer } from "@/lib/supabase-server";
import { CAFES } from "@/data/cafes";
import type { ReviewRow } from "@/lib/types";

export type ReviewResult =
  | { ok: true; data: ReviewRow }
  | { ok: false; error: string };

export async function submitReview(formData: {
  slug: string;
  name: string;
  rating: number;
  comment: string;
}): Promise<ReviewResult> {
  const sb = await getSupabaseServer();
  if (!sb) {
    return { ok: false, error: "Database not configured" };
  }

  // Rate limit by client IP (Supabase-backed durable limiter)
  const hdrs = await headers();
  const ipHash = createHash("sha256")
    .update(resolveClientIp((name) => hdrs.get(name)))
    .digest("hex");
  const rl = await checkReviewRateLimit(ipHash);
  if (!rl.allowed) {
    return { ok: false, error: "rate_limited" };
  }

  const { slug, name, rating, comment } = formData;

  // Server-side validation — cafe must exist in DB (active) or in the static curated list
  const { data: cafe, error: cafeErr } = await sb
    .from("cafes")
    .select("slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  const inStaticList = CAFES.some((c) => c.slug === slug);
  if ((cafeErr || !cafe) && !inStaticList) return { ok: false, error: "Invalid cafe" };

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

  // Attach the logged-in identity when present so reviews are attributable
  // and one account cannot review the same cafe twice (partial unique index).
  const { data: authData } = await sb.auth.getUser();
  const userId = authData?.user?.id ?? null;

  const { data, error } = await sb
    .from("reviews")
    .insert({
      cafe_slug: slug,
      author_name: safeName,
      rating,
      comment: safeComment || null,
      ...(userId ? { user_id: userId } : {}),
    })
    .select()
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, error: "already_reviewed" };
    }
    console.error("submitReview failed:", error);
    return { ok: false, error: "Failed to submit review" };
  }

  return { ok: true, data };
}

export async function deleteOwnReview(id: string): Promise<{ ok: boolean }> {
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false };
  if (typeof id !== "string" || id.length !== 36) return { ok: false };

  const { data: authData } = await sb.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return { ok: false };

  // RLS "reviews_delete_own" is the backstop; the explicit eq() keeps the
  // statement scoped even if policies change later.
  const { error } = await sb
    .from("reviews")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteOwnReview failed:", error);
    return { ok: false };
  }
  return { ok: true };
}
