"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/i18n/LangProvider";
const links = [
  ["/chat", "ผู้ช่วยค้นหาร้าน", "Cafe assistant"],
  ["/membership", "บัตรสมาชิก", "Membership"],
  ["/suggest", "แนะนำร้านใหม่", "Suggest a cafe"],
  ["/owner", "สำหรับเจ้าของร้าน", "Cafe owners"],
];
export default function FeatureNav() {
  const { lang } = useLang();
  const pathname = usePathname();
  return <nav aria-label={lang === "th" ? "บริการเพิ่มเติม" : "More services"} className="feature-nav">
    <div>{links.map(([href, th, en]) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(href + "/") ? "page" : undefined}>{lang === "th" ? th : en}</Link>)}</div>
  </nav>;
}
