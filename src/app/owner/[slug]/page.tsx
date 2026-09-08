import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import { cafeFromRow } from "@/lib/cafe-row";
import { TAG_META, LIFESTYLE_META, AREA_META, type CafeTag, type LifeStyleTag } from "@/data/cafes";
import { saveCafe, saveMenu, assignOwner } from "@/app/actions/cafe-management";
import ActionForm from "@/components/ActionForm";
import MenuDeleteButton from "@/components/MenuDeleteButton";
import CafeCommunity from "@/components/CafeCommunity";

export default async function CafeEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await getSupabaseServer();
  if (!sb) redirect("/owner");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/login?next=/owner/${slug}`);
  const { data: admin } = await sb.rpc("is_admin");
  const { data: owner } = await sb.from("cafe_owners").select("user_id").eq("cafe_slug", slug).maybeSingle();
  if (!admin && owner?.user_id !== user.id) notFound();
  const { data: row } = await sb.from("cafes").select("*").eq("slug", slug).maybeSingle();
  if (!row) notFound();
  const cafe = cafeFromRow(row);
  const { data: menu, error } = await sb.from("menu_items").select("id,name:name_th,nameEn:name_en,price,available:is_available").eq("cafe_slug", slug).order("created_at");
  return <div className="feature-page"><Link href={admin ? "/admin" : "/owner"}>← กลับหน้าจัดการ</Link><h1 className="mt-4">{cafe.name.th}</h1><Link href={`/cafes/${slug}`}>ดูหน้าร้าน →</Link>
    <section className="feature-card"><h2>ข้อมูลร้าน</h2><ActionForm action={saveCafe}>
      <input type="hidden" name="slug" value={slug} />
      {admin && <label><span><input type="checkbox" name="isActive" defaultChecked={row.is_active} /> เผยแพร่ร้านในเว็บไซต์ (ปิดเมื่อร้านเลิกกิจการ)</span></label>}
      <div className="feature-grid">
        <label>ชื่อร้าน<input name="name" defaultValue={cafe.name.th} required maxLength={160} /></label>
        <label>ชื่อภาษาอังกฤษ<input name="nameEn" defaultValue={cafe.name.en} maxLength={160} /></label>
        <label>รายละเอียด<textarea name="description" defaultValue={cafe.description.th} maxLength={2000} rows={4} /></label>
        <label>รายละเอียดภาษาอังกฤษ<textarea name="descriptionEn" defaultValue={cafe.description.en} maxLength={2000} rows={4} /></label>
        <label>ที่อยู่<input name="address" defaultValue={cafe.address.th} maxLength={500} /></label>
        <label>ที่อยู่ภาษาอังกฤษ<input name="addressEn" defaultValue={cafe.address.en} maxLength={500} /></label>
        <label>โทรศัพท์<input name="phone" defaultValue={cafe.phone} maxLength={40} /></label>
        <label>รูปหน้าร้าน<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
        <label>เวลาเปิด<input type="time" name="openTime" defaultValue={cafe.openTime} required /></label>
        <label>เวลาปิด<input type="time" name="closeTime" defaultValue={cafe.closeTime} required /></label>
        <label>ละติจูด<input type="number" step="any" name="lat" defaultValue={cafe.lat} readOnly={!admin} required min={19} max={20} /></label>
        <label>ลองจิจูด<input type="number" step="any" name="lng" defaultValue={cafe.lng} readOnly={!admin} required min={99.6} max={100.2} /></label>
        <label>พื้นที่<select name="area" defaultValue={cafe.area} disabled={!admin}>{Object.entries(AREA_META).map(([key, value]) => <option value={key} key={key}>{value.label.th}</option>)}</select></label>
        <label>ระดับราคา<select name="priceRange" defaultValue={cafe.priceRange}><option value="1">฿</option><option value="2">฿฿</option></select></label>
      </div>
      {!admin && <p>หากพิกัดหรือพื้นที่ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลเพื่อให้ตรวจสอบและแก้ไข</p>}
      <fieldset><legend>วันหยุดประจำ</legend><div className="flex flex-wrap gap-4 mt-2">{["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"].map((day, i) => <label key={day}><span><input name="closedDays" type="checkbox" value={i} defaultChecked={cafe.closedDays.includes(i)} /> {day}</span></label>)}</div></fieldset>
      <fieldset><legend>สไตล์ร้าน</legend><div className="flex flex-wrap gap-4 mt-2">{Object.entries(TAG_META).map(([key, value]) => <label key={key}><span><input name="tags" type="checkbox" value={key} defaultChecked={cafe.tags.includes(key as CafeTag)} /> {value.label.th}</span></label>)}</div></fieldset>
      <fieldset><legend>สิ่งอำนวยความสะดวก</legend><div className="flex flex-wrap gap-4 mt-2">{Object.entries(LIFESTYLE_META).map(([key, value]) => <label key={key}><span><input name="lifestyleTags" type="checkbox" value={key} defaultChecked={cafe.lifestyleTags.includes(key as LifeStyleTag)} /> {value.label.th}</span></label>)}</div></fieldset>
    </ActionForm></section>
    <section className="feature-card"><h2>เพิ่มเมนู</h2><ActionForm action={saveMenu} reset label="เพิ่มเมนู"><input type="hidden" name="slug" value={slug} /><MenuFields /><label><span><input type="checkbox" name="available" defaultChecked /> พร้อมขาย</span></label></ActionForm></section>
    {error && <p role="alert">โหลดเมนูไม่สำเร็จ กรุณาลองใหม่</p>}
    <div className="feature-grid">{menu?.map(item => <section className="feature-card" key={item.id}><ActionForm action={saveMenu}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={item.id} /><MenuFields name={item.name} nameEn={item.nameEn} price={item.price} /><label><span><input type="checkbox" name="available" defaultChecked={item.available} /> พร้อมขาย (ปิดเมื่อหมด)</span></label></ActionForm><MenuDeleteButton slug={slug} id={item.id} /></section>)}</div>
    <CafeCommunity slug={slug} admin={admin === true} />
    {admin && <section className="feature-card"><h2>กำหนดเจ้าของร้าน</h2><p className="mb-4">ตรวจสอบเจ้าของร้านก่อนให้สิทธิ์ ใช้รหัสสมาชิกจากหน้าโปรไฟล์หรือบัตรสมาชิก</p><ActionForm action={assignOwner}><input type="hidden" name="slug" value={slug} /><label>รหัสสมาชิก (เว้นว่างเพื่อยกเลิกสิทธิ์)<input name="userId" defaultValue={owner?.user_id ?? ""} maxLength={36} /></label></ActionForm></section>}
  </div>;
}
function MenuFields({ name = "", nameEn = "", price = 0 }: { name?: string; nameEn?: string; price?: number }) {
  return <><label>ชื่อเมนู<input name="name" defaultValue={name} maxLength={120} required /></label><label>ชื่อเมนูภาษาอังกฤษ<input name="nameEn" defaultValue={nameEn} maxLength={120} /></label><label>ราคา (บาท)<input name="price" type="number" step="0.01" min={0} max={100000} defaultValue={price} required /></label><label>รูปเมนู<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label></>;
}
