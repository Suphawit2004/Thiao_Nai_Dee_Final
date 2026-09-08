"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MutationResult } from "@/app/actions/cafe-management";
export default function ActionForm({ action, children, label = "บันทึก", reset = false }: {
  action: (form: FormData) => Promise<MutationResult>; children: React.ReactNode; label?: string; reset?: boolean;
}) {
  const [pending, setPending] = useState(false), [message, setMessage] = useState("");
  const router = useRouter();
  return <form className="feature-form" onSubmit={async e => {
    e.preventDefault(); const form = e.currentTarget; setPending(true); setMessage("");
    try { const result = await action(new FormData(form)); setMessage(result.message);
      if (result.ok) { if (reset) form.reset(); router.refresh(); }
    } catch { setMessage("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่"); } finally { setPending(false); }
  }}>
    <fieldset disabled={pending} className="grid gap-4">{children}</fieldset>
    <div className="flex flex-wrap items-center gap-3"><button disabled={pending} className="feature-button">{pending ? "กำลังบันทึก…" : label}</button><p role="status" className="text-sm">{message}</p></div>
  </form>;
}
