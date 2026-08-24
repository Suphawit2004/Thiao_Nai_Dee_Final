"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/i18n/LangProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

function LoginFormInner() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const authError = searchParams.get("error") === "auth";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase || !email.trim()) return;
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setStatus(error ? "error" : "sent");
  };

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-semibold text-emerald-800">{t("login.checkEmail")}</p>
        <p className="mt-1 text-xs text-emerald-700/80">{email}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="login-email" className="block text-sm font-semibold text-espresso">
          {t("login.emailLabel")}
        </label>
        <input
          id="login-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("login.emailPh")}
          autoComplete="email"
          className="mt-1.5 w-full rounded-xl border border-[#e8dcc8] bg-sand/40 px-4 py-3 text-sm outline-none transition focus:border-latte focus:bg-white"
        />
      </div>

      {!getSupabaseBrowser() && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {t("login.notConfigured")}
        </p>
      )}
      {authError && status !== "error" && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {t("login.authError")}
        </p>
      )}
      {status === "error" && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{t("login.error")}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full bg-coffee px-6 py-3 text-sm font-bold text-cream transition hover:bg-[#684a37] disabled:opacity-60"
      >
        {status === "sending" ? `⏳ ${t("login.sending")}` : `✉️ ${t("login.submit")}`}
      </button>
    </form>
  );
}

export default function LoginView() {
  const { t } = useLang();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center text-2xl font-bold text-espresso">🔑 {t("login.title")}</h1>
      <p className="mt-2 text-center text-sm leading-relaxed text-espresso/70">{t("login.desc")}</p>

      <div className="mt-8 rounded-2xl border border-[#eee3d2] bg-white p-6 shadow-sm">
        <Suspense fallback={<div className="h-40" aria-hidden />}>
          <LoginFormInner />
        </Suspense>
      </div>
    </div>
  );
}