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
  const supabaseReady = getSupabaseBrowser() !== null;

  // Where to send the user after the auth callback. Same-origin paths only;
  // /auth/callback enforces this too.
  const nextPath = searchParams.get("next");
  const safeNext = nextPath && nextPath.startsWith("/") ? nextPath : "/profile";
  const callbackUrl = () => {
    const cb = new URL(`${window.location.origin}/auth/callback`);
    if (safeNext !== "/profile") cb.searchParams.set("next", safeNext);
    return cb.toString();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase || !email.trim()) return;
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: callbackUrl(),
      },
    });
    setStatus(error ? "error" : "sent");
  };

  const signInWithGoogle = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    // OAuth normally navigates away; an error means the provider is likely
    // not enabled for this Supabase project.
    if (error) setStatus("error");
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

      {!supabaseReady && (
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
        disabled={status === "sending" || !supabaseReady}
        className="rounded-full bg-coffee px-6 py-3 text-sm font-bold text-cream transition hover:bg-[#684a37] disabled:opacity-60"
      >
        {status === "sending" ? `⏳ ${t("login.sending")}` : `✉️ ${t("login.submit")}`}
      </button>

      <div className="flex items-center gap-3 pt-1" aria-hidden>
        <span className="h-px flex-1 bg-[#eee3d2]" />
        <span className="text-xs font-medium text-espresso/50">{t("login.orDivider")}</span>
        <span className="h-px flex-1 bg-[#eee3d2]" />
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={status === "sending" || !supabaseReady}
        className="flex items-center justify-center gap-2.5 rounded-full border border-[#e8dcc8] bg-white px-6 py-3 text-sm font-semibold text-espresso transition hover:bg-sand/50 disabled:opacity-60"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-4">
          <path
            fill="#4285F4"
            d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.56-5.16 3.56-8.81Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.28a7.19 7.19 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.76c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.87 8.87 4.76 12 4.76Z"
          />
        </svg>
        {t("login.google")}
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