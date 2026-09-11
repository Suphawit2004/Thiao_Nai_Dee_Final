"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { listPhotos, listMyPhotos, uploadPhoto, changePhoto, type CommunityPhoto } from "@/app/actions/photos";
import { useCatalog } from "./CatalogProvider";
import { useLang } from "@/i18n/LangProvider";
import ActionForm from "./ActionForm";
import styles from "./CafeCommunity.module.css";
export default function CafeCommunity({ slug, admin = false }: { slug: string; admin?: boolean }) {
  const { user } = useAuth();
  return <PhotoGallery key={`${slug}:${user?.id ?? "guest"}`} slug={slug} admin={admin} />;
}
export function MyPhotos() {
  const { user } = useAuth();
  if (!user) return null;
  return <PhotoGallery key={user.id} admin={false} />;
}
function PhotoGallery({ slug, admin }: { slug?: string; admin: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const cafes = useCatalog();
  const { tr } = useLang();
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]), [message, setMessage] = useState("กำลังโหลดรูป…");
  const refresh = useCallback(async () => {
    try { const result = await (slug === undefined ? listMyPhotos() : listPhotos(slug)); setPhotos(result.photos); setMessage(result.error ?? ""); }
    catch { setMessage("โหลดรูปไม่สำเร็จ กรุณาลองใหม่"); }
  }, [slug]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const result = await (slug === undefined ? listMyPhotos() : listPhotos(slug)); if (active) { setPhotos(result.photos); setMessage(result.error ?? ""); } }
      catch { if (active) setMessage("โหลดรูปไม่สำเร็จ กรุณาลองใหม่"); }
    };
    void load(); window.addEventListener("focus", load); const timer = setInterval(load, 45000);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", load); };
  }, [slug, user?.id]);
  return <section className={`feature-card ${styles.section}`}>
    <header className={styles.header}>
      <div><h2>{slug ? "ภาพจากผู้มาเยือน" : "รูปที่ฉันโพสต์"}</h2>
        <p>{slug ? "แบ่งปันมุมโปรด เครื่องดื่ม และบรรยากาศของร้าน" : "เก็บภาพคาเฟ่ที่คุณแบ่งปันไว้ในที่เดียว"}</p></div>
      {!slug && <Link href="/cafes" className="feature-button">เลือกร้านเพื่อเพิ่มรูป</Link>}
    </header>
    {slug && (loading ? <p role="status">กำลังตรวจสอบการเข้าสู่ระบบ…</p> : user ?
      <PhotoComposer slug={slug} onUploaded={refresh} /> :
      <div className={styles.signIn}><div><strong>มีมุมโปรดของร้านนี้ไหม?</strong><p>เข้าสู่ระบบเพื่อเพิ่มรูปและเก็บไว้ในโปรไฟล์ของคุณ</p></div>
        <Link href={`/login?next=/cafes/${slug}`} className="feature-button">เข้าสู่ระบบเพื่อเพิ่มรูป</Link></div>)}
    <div className={styles.toolbar}><h3>{slug ? "แกลเลอรีของร้าน" : "แกลเลอรีของฉัน"} <span>{photos.length} รูป</span></h3>
      <button type="button" onClick={refresh}>รีเฟรชรูป</button></div>
    {message && <p role="status" className={styles.notice}>{message}</p>}
    <div className={styles.gallery}>{photos.map(photo => {
      const cafe = cafes.find(c => c.slug === photo.cafe_slug);
      const canManage = photo.user_id === user?.id || admin || isAdmin;
      return <figure key={photo.id} className={styles.photo}>
        <div className={styles.imageWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.caption || "ภาพบรรยากาศร้านจากผู้ใช้"} loading="lazy" />
          {canManage && <span className={photo.is_public ? styles.publicBadge : styles.privateBadge}>{photo.is_public ? "สาธารณะ" : "ส่วนตัว"}</span>}
        </div>
        <figcaption className={styles.caption}>
          {!slug && <Link href={`/cafes/${photo.cafe_slug}`}>{cafe ? tr(cafe.name) : "ดูหน้าคาเฟ่"}</Link>}
          <p>{photo.caption || "ภาพบรรยากาศจากผู้มาเยือน"}</p>
        </figcaption>
        {canManage && <div className={styles.actions}>
          <ActionForm label={photo.is_public ? "เก็บเป็นส่วนตัว" : "เผยแพร่"} action={async () => { const result = await changePhoto(photo.id, photo.is_public ? "private" : "public"); if (result.ok) await refresh(); return result; }}>{null}</ActionForm>
          <div className={styles.deleteAction}><ActionForm label="ลบรูป" action={async () => { if (!window.confirm("ลบรูปนี้? รูปจะถูกนำออกจากหน้าร้านและโปรไฟล์")) return { ok: false, message: "ยกเลิกการลบ" }; const result = await changePhoto(photo.id, "delete"); if (result.ok) await refresh(); return result; }}>{null}</ActionForm></div>
        </div>}
      </figure>;
    })}</div>
    {!photos.length && !message && <div className={styles.empty}><strong>{slug ? "เป็นคนแรกที่แบ่งปันมุมโปรด" : "เริ่มเก็บความทรงจำจากคาเฟ่"}</strong><p>{slug ? "เพิ่มภาพของคุณผ่านแบบฟอร์มด้านบนได้เลย" : "เลือกร้านที่คุณไป แล้วเพิ่มรูปจากหน้าคาเฟ่ รูปจะมาอยู่ที่นี่ด้วย"}</p></div>}
    <p className={styles.privacyNote}>รูปสาธารณะแสดงในหน้าร้านและโปรไฟล์ ส่วนรูปส่วนตัวเห็นได้เฉพาะคุณและผู้ดูแลระบบ</p>
  </section>;
}

function PhotoComposer({ slug, onUploaded }: { slug: string; onUploaded: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);
  return <div className={styles.composer}>
    <h3>เพิ่มรูปของคุณ</h3>
    <ActionForm reset label="โพสต์รูป" action={async form => {
      const result = await uploadPhoto(form);
      if (result.ok) { setFile(null); setPreview(""); setIsPublic(true); setError(""); await onUploaded(); }
      return result;
    }}>
      <input type="hidden" name="slug" value={slug} />
      <div className={styles.composeGrid}>
        <label className={styles.picker}>
          {preview ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={preview} alt="ตัวอย่างรูปที่เลือกก่อนโพสต์" /></> : <span className={styles.placeholder}><span aria-hidden="true">＋</span><strong>เลือกรูปจากอุปกรณ์</strong><small>JPG, PNG หรือ WebP ไม่เกิน 5 MB</small></span>}
          <span>{file ? "เปลี่ยนรูป" : "เลือกรูปภาพ"}</span>
          <input required type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={e => {
            const selected = e.target.files?.[0];
            setPreview(""); setFile(null); setError("");
            if (!selected) return;
            if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) || selected.size > 5 * 1024 * 1024) {
              setError("กรุณาเลือกไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB"); e.target.value = ""; return;
            }
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
          }} />
          {file && <small className={styles.filename}>{file.name}</small>}
        </label>
        <div className={styles.fields}>
          <label>คำบรรยาย <span className={styles.optional}>(ไม่บังคับ)</span><textarea name="caption" maxLength={300} rows={4} placeholder="มุมที่ชอบ เมนูที่ลอง หรือบรรยากาศของร้าน…" /></label>
          <label className={styles.visibility}><span><input type="checkbox" name="isPublic" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} /> เผยแพร่ในหน้าร้าน</span>
            <small>{isPublic ? "ทุกคนเห็นรูปนี้ในหน้าร้าน และรูปจะอยู่ในโปรไฟล์ของคุณด้วย" : "เก็บในโปรไฟล์ของคุณ เห็นได้เฉพาะคุณและผู้ดูแลระบบ"}</small></label>
        </div>
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </ActionForm>
  </div>;
}
