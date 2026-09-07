"use server";
import { getSupabaseServer } from "@/lib/supabase-server";
import type { MutationResult } from "./cafe-management";
export type CommunityPhoto = { id: string; user_id: string; caption: string; is_public: boolean; url: string };

export async function listPhotos(slug: string): Promise<{ photos: CommunityPhoto[]; error?: string }> {
  const sb = await getSupabaseServer();
  if (!sb) return { photos: [], error: "ยังไม่ได้เชื่อมต่อระบบรูปภาพ" };
  const { data, error } = await sb.from("cafe_photos").select("id, user_id, path, caption, is_public").eq("cafe_slug", slug).order("created_at", { ascending: false }).limit(100);
  if (error) return { photos: [], error: "โหลดรูปไม่สำเร็จ กรุณาลองใหม่" };
  const photos = await Promise.all((data ?? []).map(async row => {
    const { data: signed } = await sb.storage.from("cafe-community").createSignedUrl(row.path, 60);
    return { id: row.id, user_id: row.user_id, caption: row.caption, is_public: row.is_public, url: signed?.signedUrl ?? "" };
  }));
  return { photos: photos.filter(p => p.url) };
}

export async function uploadPhoto(form: FormData): Promise<MutationResult> {
  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!sb || !user) return { ok: false, message: "กรุณาเข้าสู่ระบบ" };
  const file = form.get("photo");
  const slug = String(form.get("slug") ?? "");
  if (!(file instanceof File) || !file.size || file.size > 5242880 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { ok: false, message: "ใช้รูป JPG, PNG หรือ WebP ไม่เกิน 5 MB" };
  const { data: cafe } = await sb.from("cafes").select("slug").eq("slug", slug).maybeSingle();
  if (!cafe) return { ok: false, message: "ไม่พบร้านที่เผยแพร่แล้ว" };
  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await sb.storage.from("cafe-community").upload(path, file, { contentType: file.type });
  if (uploadError) return { ok: false, message: "อัปโหลดไม่สำเร็จ กรุณาลองใหม่" };
  const { error } = await sb.from("cafe_photos").insert({ cafe_slug: slug, user_id: user.id, path,
    caption: String(form.get("caption") ?? "").trim().slice(0, 300), is_public: form.get("isPublic") === "on" });
  if (error) { await sb.storage.from("cafe-community").remove([path]); return { ok: false, message: "บันทึกรูปไม่สำเร็จ" }; }
  return { ok: true, message: "เพิ่มรูปเรียบร้อยแล้ว" };
}

export async function changePhoto(id: string, operation: "public" | "private" | "delete"): Promise<MutationResult> {
  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!sb || !user) return { ok: false, message: "กรุณาเข้าสู่ระบบ" };
  const { data: row } = await sb.from("cafe_photos").select("path, user_id").eq("id", id).maybeSingle();
  const { data: admin } = await sb.rpc("is_admin");
  if (!row || (row.user_id !== user.id && !admin)) return { ok: false, message: "คุณไม่มีสิทธิ์แก้ไขรูปนี้" };
  if (!["public", "private", "delete"].includes(operation)) return { ok: false, message: "คำสั่งไม่ถูกต้อง" };
  const query = operation === "delete" ? sb.from("cafe_photos").delete() : sb.from("cafe_photos").update({ is_public: operation === "public" });
  const { error, data } = await query.eq("id", id).select("id").single();
  if (error || !data) return { ok: false, message: "แก้ไขรูปไม่สำเร็จ" };
  if (operation === "delete") await sb.storage.from("cafe-community").remove([row.path]);
  return { ok: true, message: "บันทึกเรียบร้อยแล้ว" };
}
