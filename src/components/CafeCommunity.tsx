"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { listPhotos, uploadPhoto, changePhoto, type CommunityPhoto } from "@/app/actions/photos";
import ActionForm from "./ActionForm";
export default function CafeCommunity({ slug, admin = false }: { slug: string; admin?: boolean }) {
  const { user } = useAuth();
  return <PhotoGallery key={`${slug}:${user?.id ?? "guest"}`} slug={slug} admin={admin} />;
}
function PhotoGallery({ slug, admin }: { slug: string; admin: boolean }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]), [message, setMessage] = useState("กำลังโหลดรูป…");
  const refresh = useCallback(async () => {
    try { const result = await listPhotos(slug); setPhotos(result.photos); setMessage(result.error ?? ""); }
    catch { setMessage("โหลดรูปไม่สำเร็จ กรุณาลองใหม่"); }
  }, [slug]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const result = await listPhotos(slug); if (active) { setPhotos(result.photos); setMessage(result.error ?? ""); } }
      catch { if (active) setMessage("โหลดรูปไม่สำเร็จ กรุณาลองใหม่"); }
    };
    void load(); const timer = setInterval(load, 45000);
    return () => { active = false; clearInterval(timer); };
  }, [slug, user?.id]);
  return <section className="feature-card"><h2 className="text-xl font-bold">ภาพจากผู้มาเยือน</h2>
    <p className="mt-2 text-sm">เลือกเผยแพร่ภาพให้ทุกคนเห็น หรือเก็บไว้ดูเฉพาะคุณ</p>
    <p role="status" className="my-3 text-sm">{message}</p>
    <button onClick={refresh} className="text-sm underline">โหลดรูปอีกครั้ง</button>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 my-5">{photos.map(photo => <figure key={photo.id} className="rounded-xl border border-[#eadfcd] p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={photo.caption || "ภาพบรรยากาศร้านจากผู้ใช้"} className="aspect-[4/3] w-full rounded-lg object-cover" />
      <figcaption className="my-2 text-sm">{photo.caption}{!photo.is_public && <span className="block text-coffee">ส่วนตัว</span>}</figcaption>
      {(photo.user_id === user?.id || admin) && <div className="flex flex-wrap gap-2">
        <ActionForm label={photo.is_public ? "เก็บเป็นส่วนตัว" : "เผยแพร่"} action={async () => { const result = await changePhoto(photo.id, photo.is_public ? "private" : "public"); if (result.ok) await refresh(); return result; }}>{null}</ActionForm>
        <ActionForm label="ลบรูป" action={async () => { if (!window.confirm("ลบรูปนี้?")) return { ok: false, message: "ยกเลิกการลบ" }; const result = await changePhoto(photo.id, "delete"); if (result.ok) await refresh(); return result; }}>{null}</ActionForm>
      </div>}
    </figure>)}</div>
    {!photos.length && !message && <p className="mb-4 text-sm">ยังไม่มีภาพ มาแบ่งปันภาพแรกของร้านนี้กัน</p>}
    {user ? <ActionForm reset label="เพิ่มรูป" action={async form => { const result = await uploadPhoto(form); if (result.ok) await refresh(); return result; }}>
      <input type="hidden" name="slug" value={slug} /><label>รูปภาพ (ไม่เกิน 5 MB)<input required type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
      <label>คำบรรยาย<input name="caption" maxLength={300} /></label><label><span><input type="checkbox" name="isPublic" /> เผยแพร่ภาพนี้ในหน้าร้าน</span></label>
    </ActionForm> : <Link href={`/login?next=/cafes/${slug}`} className="underline">เข้าสู่ระบบเพื่อแบ่งปันภาพ</Link>}
  </section>;
}
