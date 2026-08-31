"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type AdminResult } from "./admin";

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function getAdminList(): Promise<string[]> {
  const sb = await requireAdmin();
  if (!sb) return [];
  const { data } = await sb.from("admins").select("email").order("email");
  return (data ?? []).map((r) => r.email as string);
}

export async function addAdmin(email: string): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };

  const clean = email.trim().toLowerCase();
  if (!validEmail(clean)) return { ok: false, error: "Invalid email" };

  const { data: existing } = await sb
    .from("admins")
    .select("email")
    .eq("email", clean)
    .maybeSingle();
  if (existing) return { ok: false, error: "Already admin" };

  const { error } = await sb.from("admins").insert({ email: clean });
  if (error) {
    console.error("addAdmin failed:", error);
    return { ok: false, error: "Add failed" };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function removeAdmin(email: string): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };

  const clean = email.trim().toLowerCase();
  if (!validEmail(clean)) return { ok: false, error: "Invalid email" };

  const { data: me } = await sb.auth.getUser();
  if (me.user && me.user.email?.toLowerCase() === clean) {
    return { ok: false, error: "Cannot remove self" };
  }

  const { error } = await sb.from("admins").delete().eq("email", clean);
  if (error) {
    console.error("removeAdmin failed:", error);
    return { ok: false, error: "Remove failed" };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function addAdminFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  return addAdmin(String(formData.get("email") ?? ""));
}

export async function removeAdminFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  return removeAdmin(String(formData.get("email") ?? ""));
}
