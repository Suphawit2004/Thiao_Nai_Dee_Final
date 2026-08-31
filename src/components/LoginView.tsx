"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLang } from "@/i18n/LangProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type PasswordMode = "signin" | "signup";

function LoginFormInner() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("signin");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const authError = searchParams.get("error") === "auth";
  const supabaseReady = getSupabaseBrowser() !== null;

  const nextPath = searchParams.get("next");
  const safeNext = nextPath && nextPath.startsWith("/") ? nextPath : "/";
  const callbackUrl = () => {
    const cb = new URL(`${window.location.origin}/auth/callback`);
    if (safeNext !== "/") cb.searchParams.set("next", safeNext);
    return cb.toString();
  };

  const clearError = () => setErrorMsg(null);

  const redirectAfterLogin = async () => {
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (isAdmin) {
        router.push("/admin");
        router.refresh();
        return;
      }
    }
    router.push(safeNext);
    router.refresh();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const supabase = getSupabaseBrowser();
    if (!supabase || !email.trim() || !password) return;
    setStatus("sending");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setStatus("error");
      setErrorMsg(t("login.invalidCredentials"));
    } else {
      setStatus("sent");
      setTimeout(() => redirectAfterLogin(), 500);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (password !== confirmPassword) {
      setErrorMsg(t("login.passwordsMismatch"));
      return;
    }
    if (password.length < 6) {
      setErrorMsg(t("login.passwordTooShort"));
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase || !email.trim()) return;
    setStatus("sending");
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
      setTimeout(() => redirectAfterLogin(), 500);
    }
  };

  const signInWithGoogle = async () => {
    clearError();
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) setStatus("error");
  };

  if (status === "sent") {
    return (
      <div className="animate-fade-in rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-4 size-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <span className="text-2xl">✨</span>
        </div>
        <p className="text-base font-semibold text-emerald-800">
          {passwordMode === "signup" ? t("login.accountCreated") : t("login.signedIn")}
        </p>
        <p className="mt-2 text-sm text-emerald-700/80">{email}</p>
        <p className="mt-4 text-xs text-emerald-600/70">{t("login.redirecting")}</p>
      </div>
    );
  }

  const inputClassName =
    "w-full rounded-xl border border-[#e8dcc8] bg-sand/40 px-4 py-3.5 text-sm outline-none transition-all duration-200 focus:border-latte focus:bg-white focus:ring-2 focus:ring-latte/20 placeholder:text-espresso/30 hover:border-[#d9c9ac]";

  const labelClassName = "block mb-1.5 text-sm font-medium text-espresso";

  const errorClassName = "animate-shake rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700";

  const tabClassName = (selected: boolean) => `
    flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200
    ${selected
      ? "bg-coffee text-cream shadow-md shadow-coffee/30"
      : "bg-sand/50 text-espresso hover:bg-sand hover:text-coffee"
    }
  `;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex gap-2" role="tablist" aria-label={t("login.desc")}>
        <button
          type="button"
          role="tab"
          aria-selected={passwordMode === "signin"}
          onClick={() => {
            setPasswordMode("signin");
            clearError();
          }}
          className={tabClassName(passwordMode === "signin")}
        >
          {t("login.signIn")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={passwordMode === "signup"}
          onClick={() => {
            setPasswordMode("signup");
            clearError();
          }}
          className={tabClassName(passwordMode === "signup")}
        >
          {t("login.signUp")}
        </button>
      </div>

      <form onSubmit={passwordMode === "signin" ? handleSignIn : handleSignUp} className="space-y-5 animate-slide-up" noValidate>
        <div>
          <label htmlFor="login-email" className={labelClassName}>
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
            className={inputClassName}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="login-password" className={labelClassName}>
            {t("login.passwordLabel")}
          </label>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("login.passwordPh")}
            autoComplete={passwordMode === "signup" ? "new-password" : "current-password"}
            className={inputClassName}
          />
        </div>

        {passwordMode === "signup" && (
          <div>
            <label htmlFor="login-confirm-password" className={labelClassName}>
              {t("login.confirmPasswordLabel")}
            </label>
            <input
              id="login-confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("login.confirmPasswordPh")}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>
        )}

        {!supabaseReady && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("login.notConfigured")}
          </p>
        )}
        {authError && status !== "error" && (
          <p className={errorClassName}>{t("login.authError")}</p>
        )}
        {status === "error" && (
          <p className={errorClassName}>{errorMsg || t("login.error")}</p>
        )}

        <button
          type="submit"
          disabled={status === "sending" || !supabaseReady}
          className="w-full rounded-xl bg-coffee px-6 py-3.5 text-sm font-semibold text-cream transition-all duration-200 hover:bg-[#684a37] hover:shadow-lg hover:shadow-coffee/30 active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed focus:ring-2 focus:ring-coffee/40 focus:ring-offset-2"
        >
          {status === "sending" ? (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              {t("login.sending")}
            </>
          ) : (
            <>
              <span className="inline-block mr-2">{passwordMode === "signin" ? "🔐" : "✨"}</span>
              {passwordMode === "signin" ? t("login.signIn") : t("login.signUp")}
            </>
          )}
        </button>
      </form>

      <div className="relative pt-2" aria-hidden>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#eee3d2]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-white px-4 text-espresso/40 font-medium">
            {t("login.orDivider")}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={status === "sending" || !supabaseReady}
        className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#e8dcc8] bg-white px-6 py-3.5 text-sm font-semibold text-espresso transition-all duration-200 hover:bg-sand/50 hover:border-latte hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed focus:ring-2 focus:ring-latte/40 focus:ring-offset-2"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-5">
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

      <p className="text-center text-xs text-espresso/40">
        {t("login.desc")}
      </p>
    </div>
  );
}

export default function LoginView() {
  const { t } = useLang();

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <div className="text-center mb-8 sm:mb-10">
        <div className="mx-auto mb-5 size-14 rounded-2xl bg-gradient-to-br from-coffee to-[#8b6f52] flex items-center justify-center shadow-lg shadow-coffee/30">
          <span className="text-2xl sm:text-3xl">☕</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-espresso tracking-tight">
          {t("login.title")}
        </h1>
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-espresso/60 max-w-sm mx-auto">
          {t("login.desc")}
        </p>
      </div>

      <div className="rounded-2xl border border-[#eee3d2] bg-white/80 backdrop-blur-sm p-6 sm:p-8 shadow-sm sm:shadow-md">
        <Suspense fallback={
          <div className="h-32 sm:h-40 flex items-center justify-center" aria-hidden>
            <div className="animate-pulse text-espresso/30">⏳</div>
          </div>
        }>
          <LoginFormInner />
        </Suspense>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.45s ease-out forwards;
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}