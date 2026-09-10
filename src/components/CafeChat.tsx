"use client";
import { useState } from "react";
import Link from "next/link";
type Reply = { message: string; mode: string; cafes: { slug: string; name: string; openTime: string; closeTime: string; closedDays: number[]; address: string }[] };
export default function CafeChat() {
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<{ question: string; reply: Reply }[]>([]);
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  async function send(question: string) {
    if (!question.trim() || pending) return; setPending(true); setError("");
    try { const response = await fetch("/api/cafe-assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: question }), signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw Error(); const reply: Reply = await response.json();
      setTurns(old => [...old.slice(-19), { question, reply }]); setQuery("");
    } catch { setError("ส่งข้อความไม่สำเร็จ กรุณาลองใหม่"); } finally { setPending(false); }
  }
  return <div className="feature-page chat-page"><h1>วันนี้อยากไปคาเฟ่แบบไหน?</h1><p>ผู้ช่วยค้นหาร้านและเวลาเปิดปิดในอำเภอเมืองพะเยา</p>
    <div className="flex flex-wrap gap-2 mt-5">{["คาเฟ่เงียบเหมาะอ่านหนังสือ", "อยากพักผ่อนฮีลใจ", "ร้านเปิดดึก"].map(q => <button className="rounded-full border border-[#d9c9ac] px-4 py-2 text-sm" key={q} disabled={pending} onClick={() => send(q)}>{q}</button>)}</div>
    <div role="log" aria-live="polite" className="my-6 space-y-5">{turns.map((turn, index) => <div key={index}><p className="ml-8 rounded-2xl bg-[#6b4c38] p-4 text-white">{turn.question}</p><div className="feature-card"><p>{turn.reply.message}</p><p className="mt-2 text-xs text-coffee">{turn.reply.mode === "ai" ? "AI ช่วยค้นหา · รายละเอียดจากข้อมูลร้าน" : "ค้นหาจากข้อมูลร้านในระบบ"}</p><ul className="mt-4 space-y-4">{turn.reply.cafes.map(c => <li key={c.slug} className="border-t border-[#eadfcd] pt-3"><Link className="font-semibold underline" href={`/cafes/${c.slug}`}>{c.name} →</Link><p className="text-sm">{c.openTime} – {c.closeTime}{c.closedDays.length ? ` · หยุด${c.closedDays.map(d => ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"][d]).join(", ")}` : ""}</p><p className="text-sm">{c.address}</p></li>)}</ul></div></div>)}</div>
    <form className="feature-form feature-card" onSubmit={e => { e.preventDefault(); void send(query); }}><label>คำถามของคุณ<textarea value={query} onChange={e => setQuery(e.target.value)} rows={3} maxLength={500} required placeholder="เช่น บ้านบานน์เปิดกี่โมง" disabled={pending} /></label><button disabled={pending} className="feature-button">{pending ? "กำลังค้นหา…" : "ส่งคำถาม"}</button><p role="status">{error}</p></form>
  </div>;
}
