"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase-server";
import { checkReportRateLimit } from "@/lib/rate-limit";
import { resolveClientIp } from "@/lib/client-ip";

export type ReportResult =
  | { ok: true }
  | { ok: false; error: "not_configured" | "rate_limited" | "invalid" | "failed" };

const FIELDS = new Set(["hours", "phone", "address", "location", "closed_days", "other"]);

function optionalText(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function submitReport(input: {
  slug: string;
  field: string;
  message: string;
  suggestedValue?: string | null;
  contact?: string | null;
}): Promise<ReportResult> {
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "not_configured" };

  // Rate limit by client IP (single-instance in-memory limiter)
  const hdrs = await headers();
  const ipHash = createHash("sha256")
    .update(resolveClientIp((name) => hdrs.get(name)))
    .digest("hex");
  if (!checkReportRateLimit(ipHash).allowed) {
    return { ok: false, error: "rate_limited" };
  }

  const slug = input.slug?.trim() ?? "";
  const message = input.message?.trim() ?? "";
  if (!slug || slug.length > 100 || !FIELDS.has(input.field)) {
    return { ok: false, error: "invalid" };
  }
  if (!message || message.length > 500) return { ok: false, error: "invalid" };

  const { error } = await sb.from("data_reports").insert({
    cafe_slug: slug,
    field: input.field,
    message,
    suggested_value: optionalText(input.suggestedValue, 300),
    contact: optionalText(input.contact, 120),
  });

  if (error) {
    console.error("submitReport failed:", error);
    return { ok: false, error: "failed" };
  }

  return { ok: true };
}
