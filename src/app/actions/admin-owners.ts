"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type AdminResult } from "./admin";

/**
 * Approve an owner request: link the requesting user as the cafe owner and
 * mark the request approved (and the user's profile role to 'owner').
 */
export async function approveOwnerRequest(id: string): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Invalid id" };

  const { data: req } = await sb
    .from("owner_requests")
    .select("cafe_slug, user_id, status")
    .eq("id", id)
    .single();
  if (!req) return { ok: false, error: "Request not found" };
  if (req.status === "approved") return { ok: false, error: "Already approved" };

  const slug = req.cafe_slug as string;
  const userId = req.user_id as string;

  // Clear any previous owner (one owner per cafe).
  await sb.from("cafes").update({ owner_id: userId }).eq("slug", slug);

  const { error: upReq } = await sb
    .from("owner_requests")
    .update({ status: "approved" })
    .eq("id", id);
  if (upReq) {
    console.error("approveOwnerRequest failed:", upReq);
    return { ok: false, error: "Update failed" };
  }

  // Promote the user to 'owner' role.
  await sb
    .from("profiles")
    .update({ role: "owner" })
    .eq("id", userId);

  revalidatePath("/admin");
  revalidatePath("/profile");
  return { ok: true };
}

export async function rejectOwnerRequest(id: string): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Invalid id" };

  const { error } = await sb
    .from("owner_requests")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) {
    console.error("rejectOwnerRequest failed:", error);
    return { ok: false, error: "Update failed" };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/** Set (or clear) the owner of a cafe directly via ID or email. */
export async function setCafeOwner(
  slug: string,
  userIdentifier: string
): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };
  if (!/^[a-z0-9-]{1,100}$/i.test(slug)) return { ok: false, error: "Invalid id" };

  const identifier = userIdentifier.trim().toLowerCase();
  // Empty => clear the owner.
  if (!identifier) {
    const { error } = await sb.from("cafes").update({ owner_id: null }).eq("slug", slug);
    if (error) return { ok: false, error: "Update failed" };
    revalidatePath("/admin");
    return { ok: true };
  }

  // Resolve the profile by email (or raw uuid).
  let query = sb.from("profiles").select("id, email");
  if (/^[0-9a-f-]{36}$/i.test(identifier)) {
    query = query.eq("id", identifier);
  } else {
    query = query.eq("email", identifier);
  }
  const { data: profile, error: profileErr } = await query.maybeSingle();
  if (profileErr || !profile) {
    return { ok: false, error: "User not found" };
  }

  const { error } = await sb.from("cafes").update({ owner_id: profile.id as string }).eq("slug", slug);
  if (error) {
    console.error("setCafeOwner failed:", error);
    return { ok: false, error: "Update failed" };
  }

  // Ensure the user is an 'owner' role.
  await sb.from("profiles").update({ role: "owner" }).eq("id", profile.id as string);

  revalidatePath("/admin");
  revalidatePath("/profile");
  return { ok: true };
}

// ---- <form action> wrappers ------------------------------------------------

export async function approveOwnerRequestFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  return approveOwnerRequest(String(formData.get("id") ?? ""));
}

export async function rejectOwnerRequestFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  return rejectOwnerRequest(String(formData.get("id") ?? ""));
}

export async function setCafeOwnerFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  return setCafeOwner(
    String(formData.get("slug") ?? ""),
    String(formData.get("owner") ?? "")
  );
}
