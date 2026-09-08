"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
type MenuItem = { id: string; name: string; price: number | null; photo_url: string | null; available: boolean };
export default function LiveMenu({ slug }: { slug: string }) {
  const [items, setItems] = useState<MenuItem[]>([]), [error, setError] = useState("");
  useEffect(() => {
    const sb = getSupabaseBrowser(); if (!sb) return;
    let active = true;
    const refresh = async () => {
      try { const result = await sb.from("menu_items").select("id,name:name_th,price,photo_url,available:is_available").eq("cafe_slug", slug).order("created_at");
        if (active) { setError(result.error ? "โหลดเมนูไม่สำเร็จ" : ""); if (!result.error) setItems(result.data ?? []); }
      } catch { if (active) setError("เชื่อมต่อเมนูไม่สำเร็จ"); }
    };
    void refresh();
    const channel = sb.channel(`menu-${slug}`).on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, refresh).subscribe();
    const timer = setInterval(refresh, 30000); window.addEventListener("focus", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); void sb.removeChannel(channel); };
  }, [slug]);
  return <section className="feature-card"><h2 className="text-xl font-bold">เมนูและสถานะพร้อมขาย</h2>{error ? <p role="status">{error}</p> : !items.length ? <p className="mt-3 text-sm">ร้านยังไม่ได้เพิ่มเมนู</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{items.map(item => <article key={item.id} className="rounded-xl bg-[#faf8f3] p-4">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {item.photo_url && <img src={item.photo_url} alt={item.name} className="aspect-[4/3] w-full rounded-lg object-cover mb-3" />}
    <h3 className="font-semibold">{item.name}</h3><p>{item.price === null ? "สอบถามราคาที่ร้าน" : `฿${Number(item.price).toLocaleString("th-TH")}`}</p><p className={item.available ? "text-emerald-700" : "text-rose-700"}>{item.available ? "พร้อมขาย" : "หมดแล้ว"}</p>
  </article>)}</div>}</section>;
}
