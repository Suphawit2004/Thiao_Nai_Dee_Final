"use client";
import { deleteMenu } from "@/app/actions/cafe-management";
import ActionForm from "./ActionForm";
export default function MenuDeleteButton({ slug, id }: { slug: string; id: string }) {
  return <div className="mt-4"><ActionForm label="ลบเมนู" action={async () => window.confirm("ลบเมนูนี้?") ? deleteMenu(slug, id) : { ok: false, message: "ยกเลิกการลบ" }}>{null}</ActionForm></div>;
}
