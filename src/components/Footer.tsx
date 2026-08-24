"use client";

import { useLang } from "@/i18n/LangProvider";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="border-t border-[#eadfcd] bg-sand/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 py-8 text-center">
        <p className="flex items-center gap-2 text-sm font-semibold text-espresso">
          <span aria-hidden>☕</span> {t("footer.tagline")}
        </p>
        <p className="text-xs text-espresso/70">
          © <span suppressHydrationWarning>{new Date().getFullYear()}</span> Thiao Nai Dee ·{" "}
          {t("footer.note")}
        </p>
      </div>
    </footer>
  );
}
