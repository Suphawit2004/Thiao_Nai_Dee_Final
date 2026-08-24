"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/i18n/LangProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function ProfileView() {
  const { t } = useLang();
  const { user, loading, signOut } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        else setDisplayName(user.email?.split("@")[0] ?? "");
      });
  }, [user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-espresso/60">⏳ …</div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-lg font-semibold text-espresso/80">🔒 {t("profile.notSignedIn")}</p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
        >
          {t("profile.signInCta")}
        </Link>
      </div>
    );
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const name = displayName.trim();
    if (!name || name.length > 60) return;
    setSaveState("saving");
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: name });
    setSaveState(error ? "error" : "saved");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center text-2xl font-bold text-espresso">👤 {t("profile.title")}</h1>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-[#eee3d2] bg-white p-6 shadow-sm">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wide text-espresso/60">
            {t("profile.email")}
          </span>
          <p className="mt-1 truncate text-sm font-medium text-espresso">{user.email}</p>
        </div>

        <form onSubmit={saveProfile} className="flex flex-col gap-2">
          <label htmlFor="display-name" className="block text-sm font-semibold text-espresso">
            {t("profile.displayName")}
          </label>
          <input
            id="display-name"
            type="text"
            required
            maxLength={60}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSaveState("idle");
            }}
            className="w-full rounded-xl border border-[#e8dcc8] bg-sand/40 px-4 py-3 text-sm outline-none transition focus:border-latte focus:bg-white"
          />
          <button
            type="submit"
            disabled={saveState === "saving"}
            className="mt-1 self-start rounded-full bg-coffee px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37] disabled:opacity-60"
          >
            {saveState === "saving"
              ? `⏳ ${t("profile.saving")}`
              : saveState === "saved"
                ? `✓ ${t("profile.saved")}`
                : t("profile.save")}
          </button>
          {saveState === "error" && (
            <p className="text-xs text-rose-700">{t("form.error")}</p>
          )}
        </form>

        <hr className="border-[#eee3d2]" />

        <button
          type="button"
          onClick={() => signOut()}
          className="self-start rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
        >
          🚪 {t("profile.signOut")}
        </button>
      </div>
    </div>
  );
}