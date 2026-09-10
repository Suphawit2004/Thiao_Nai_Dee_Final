"use client";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
export default function PasswordLogin() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [pending, setPending] = useState(false), [message, setMessage] = useState("");
  return <div className="password-login"><h2 className="font-bold mb-3">ใช้อีเมลและรหัสผ่าน</h2><div className="auth-tabs">{(["login", "signup", "reset"] as const).map(key => <button key={key} disabled={pending} aria-pressed={mode === key} className={mode === key ? "is-selected" : ""} onClick={() => { setMode(key); setMessage(""); }}>{key === "login" ? "เข้าสู่ระบบ" : key === "signup" ? "สมัครสมาชิก" : "ลืมรหัสผ่าน"}</button>)}</div>
    <form className="feature-form" onSubmit={async e => {
      e.preventDefault(); const data = new FormData(e.currentTarget); const email = String(data.get("email")), password = String(data.get("password") ?? ""); setPending(true); setMessage("");
      try { const sb = getSupabaseBrowser(); if (!sb) throw Error();
        const raw = new URLSearchParams(window.location.search).get("next");
        const next = raw?.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\") ? raw : "/profile";
        const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(mode === "reset" ? "/profile" : next)}`;
        if (mode === "reset") { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: callback }); if (error) throw Error(); setMessage("หากอีเมลนี้มีบัญชี ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่"); }
        else if (mode === "signup") { const { data: result, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: callback } }); if (error) throw Error(); if (result.session) window.location.assign(next); else setMessage("กรุณาตรวจอีเมลเพื่อยืนยันบัญชี"); }
        else { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) { setMessage("อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ยืนยันอีเมล"); return; } window.location.assign(next); }
      } catch { setMessage("ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูลและลองใหม่"); } finally { setPending(false); }
    }}><label>อีเมล<input name="email" type="email" autoComplete="email" required disabled={pending} /></label>{mode !== "reset" && <label>รหัสผ่าน<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} maxLength={128} required disabled={pending} /></label>}<button className="feature-button" disabled={pending}>{pending ? "กำลังดำเนินการ…" : mode === "login" ? "เข้าสู่ระบบ" : mode === "signup" ? "สมัครสมาชิก" : "ส่งลิงก์ตั้งรหัสผ่าน"}</button><p role="status" className="text-sm">{message}</p></form>
  </div>;
}
