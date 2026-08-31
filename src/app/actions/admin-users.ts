"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type AdminResult } from "./admin";

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function getAdminList(): Promise<string[]> {
  const sb = await requireAdmin();
  if (!sb) return [];
  const { data } = await sb.from("profiles").select("email").eq("role", "admin").order("email");
  return (data ?? []).map((r) => r.email as string);
}

export async function addAdmin(email: string): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };

  const clean = email.trim().toLowerCase();
  if (!validEmail(clean)) return { ok: false, error: "Invalid email" };

  // Find profile by email and update role to admin
  const { data: existingProfile } = await sb
    .from("profiles")
    .select("id, role")
    .eq("email", clean)
    .maybeSingle();

  if (!existingProfile) {
    return { ok: false, error: "User not found. They must sign up first." };
  }

  if (existingProfile.role === "admin") {
    return { ok: false, error: "Already admin" };
  }

  const { error } = await sb.from("profiles").update({ role: "admin" }).eq("id", existingProfile.id);
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

  const { data: targetProfile } = await sb
    .from("profiles")
    .select("id, role")
    .eq("email", clean)
    .maybeSingle();

  if (!targetProfile) {
    return { ok: false, error: "User not found" };
  }

  if (targetProfile.role !== "admin") {
    return { ok: false, error: "Not an admin" };
  }

  const { error } = await sb.from("profiles").update({ role: "user" }).eq("id", targetProfile.id);
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
