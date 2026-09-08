"use client";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useProfile } from "@/lib/use-profile";
export default function MembershipView() {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  return <div className="feature-page"><h1>สมาชิกเที่ยวไหนดี</h1><p>เก็บร้านโปรด แบ่งปันประสบการณ์ และดูสิทธิประโยชน์ของคุณ</p>
    <div className="feature-grid">
      <section className="feature-card !bg-[#3e2c23] text-[#fff5e4]"><p className="text-sm tracking-widest">THIAO NAI DEE · MEMBER</p><h2 className="mt-8">{loading ? "กำลังโหลด…" : user ? profile?.display_name || "สมาชิกเที่ยวไหนดี" : "บัตรสมาชิกของคุณ"}</h2>
        {user ? <><p className="text-sm opacity-75">รหัสสมาชิก</p><code className="break-all text-sm">{user.id}</code><p className="mt-6 text-sm">ใช้บัตรในแอปนี้แสดงต่อร้านตัวอย่างเพื่อทดลองส่วนลด</p></> : !loading && <Link className="inline-block mt-4 underline" href="/login?next=/membership">สมัครหรือเข้าสู่ระบบเพื่อรับบัตร →</Link>}
      </section>
      <section className="feature-card"><h2>ทดลองสิทธิประโยชน์</h2><p>ส่วนลดด้านล่างเป็นข้อมูลจำลองสำหรับทดสอบระบบ ยังใช้แลกสินค้าหรือส่วนลดกับร้านจริงไม่ได้</p></section>
    </div>
    <section className="feature-card"><p className="text-sm font-semibold text-coffee">ร้านตัวอย่าง · MOCK DATA</p><h2 className="mt-3">คาเฟ่ทดลองริมกว๊าน</h2><p className="text-4xl font-bold text-coffee">ลด 10%</p><p className="mt-4">สำหรับเครื่องดื่ม 1 แก้ว เมื่อแสดงบัตรสมาชิกในแอป ไม่รวมกับโปรโมชั่นอื่น</p><p className="mt-3 text-sm">{user ? "คุณมีบัตรสมาชิกแล้ว ใช้แสดงเพื่อสาธิตสิทธิ์ได้" : "เข้าสู่ระบบเพื่อแสดงบัตรสมาชิก"}</p></section>
  </div>;
}
