"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase-server";

export type AdminResult =
  | { ok: true }
  | { ok: false; error: string };

export async function requireAdmin() {
  const sb = await getSupabaseServer();
  if (!sb) return null;
  const { data, error } = await sb.rpc("is_admin");
  if (error || data !== true) return null;
  return sb;
}

export async function setSuggestionStatus(
  id: string,
  status: "pending" | "approved" | "rejected"
): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Invalid id" };

  const { error } = await sb
    .from("cafe_suggestions")
    .update({ status })
    .eq("id", id);
  if (error) {
    console.error("setSuggestionStatus failed:", error);
    return { ok: false, error: "Update failed" };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function setReportStatus(
  id: string,
  status: "resolved" | "dismissed"
): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Invalid id" };

  const { error } = await sb.from("data_reports").update({ status }).eq("id", id);
  if (error) {
    console.error("setReportStatus failed:", error);
    return { ok: false, error: "Update failed" };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteReview(id: string): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Invalid id" };

  const { error } = await sb.from("reviews").delete().eq("id", id);
  if (error) {
    console.error("deleteReview failed:", error);
    return { ok: false, error: "Delete failed" };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/** <form action={...}> wrappers — buttons post id/status via hidden inputs.
 * Return the result so client can use useActionState for feedback. */
export async function suggestionFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  return setSuggestionStatus(
    String(formData.get("id") ?? ""),
    formData.get("status") === "approved"
      ? "approved"
      : formData.get("status") === "rejected"
        ? "rejected"
        : "pending"
  );
}

export async function reportFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  const status = formData.get("status") === "dismissed" ? "dismissed" : "resolved";
  return setReportStatus(String(formData.get("id") ?? ""), status);
}

export async function deleteReviewFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  return deleteReview(String(formData.get("id") ?? ""));
}
