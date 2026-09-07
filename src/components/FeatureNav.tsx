"use client";
import Link from "next/link";
import { useLang } from "@/i18n/LangProvider";
export default function FeatureNav() {
  const { lang } = useLang();
  return <nav aria-label="บริการเพิ่มเติม" className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-b border-[#eadfcd] bg-white px-4 py-3 text-sm text-coffee">
    <Link href="/membership">{lang === "th" ? "บัตรสมาชิกและส่วนลด" : "Membership & offers"}</Link>
    <Link href="/chat">{lang === "th" ? "ผู้ช่วยค้นหาร้าน" : "Cafe assistant"}</Link>
    <Link href="/owner">{lang === "th" ? "สำหรับเจ้าของร้าน" : "Cafe owners"}</Link>
  </nav>;
}
