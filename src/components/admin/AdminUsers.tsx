"use client";

import { useActionState, useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { addAdminFormAction, removeAdminFormAction } from "@/app/actions/admin-users";

export interface AdminUser {
  id: string;
  display_name: string | null;
  email: string | null;
  role: "user" | "admin" | null;
  created_at: string;
}

export default function AdminUsers({
  admins,
  users,
}: {
  admins: string[];
  users: AdminUser[];
}) {
  const { t, lang } = useLang();
  const [email, setEmail] = useState("");

  const [addState, addAction] = useActionState(addAdminFormAction, undefined);
  const [removeState, removeAction] = useActionState(removeAdminFormAction, undefined);

  const addError = addState?.ok === false ? addState.error : null;
  const removeError = removeState?.ok === false ? removeState.error : null;
  const addSuccess = addState?.ok === true;
  const removeSuccess = removeState?.ok === true;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "th" ? "th-TH" : "en-US", {
      dateStyle: "medium",
      timeZone: "Asia/Bangkok",
    });

  const renderError = (msg: string | null) =>
    msg ? <p className="mt-1 text-xs text-rose-600">{translateError(msg)}</p> : null;

  function translateError(msg: string): string {
    if (msg.includes("User not found")) return t("admin.user.notFound");
    if (msg.includes("Already admin")) return t("admin.user.alreadyAdmin");
    if (msg.includes("Cannot remove self")) return t("admin.user.cannotRemoveSelf");
    if (msg.includes("Not an admin")) return t("admin.user.notAdmin");
    if (msg.includes("Invalid email")) return t("admin.user.invalidEmail");
    return msg;
  }

  return (
    <div className="mt-5 flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-base font-bold text-espresso">👑 {t("admin.user.adminList")}</h2>
        <div className="rounded-2xl border border-[#eee3d2] bg-white p-5 shadow-sm">
          <form action={addAction} className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("admin.user.addAdminPh")}
              required
              className="min-w-0 flex-1 rounded-full border border-[#eee3d2] bg-sand/40 px-4 py-2 text-sm outline-none focus:border-latte focus:bg-white"
            />
            <button
              disabled={!email}
              className="rounded-full bg-coffee px-5 py-2 text-sm font-semibold text-cream transition hover:bg-[#684a37] disabled:opacity-50"
            >
              + {t("admin.user.addAdmin")}
            </button>
          </form>
          {renderError(addError)}
          {addSuccess && <p className="mt-1 text-xs text-emerald-600">{t("admin.user.successAdd")}</p>}

          {admins.length === 0 ? (
            <p className="mt-4 text-sm text-espresso/50">{t("admin.user.noAdmins")}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-1.5">
              {admins.map((a) => (
                <li
                  key={a}
                  className="flex items-center justify-between gap-2 rounded-xl bg-sand/40 px-4 py-2"
                >
                  <span className="truncate text-sm font-medium text-espresso">✉️ {a}</span>
                  <form action={removeAction}>
                    <input type="hidden" name="email" value={a} />
                    <button
                      onClick={(e) => {
                        if (
                          !window.confirm(
                            t("admin.user.removeConfirm").replace("{email}", a)
                          )
                        )
                          e.preventDefault();
                      }}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      {t("admin.user.removeAdmin")}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {renderError(removeError)}
          {removeSuccess && (
            <p className="mt-1 text-xs text-emerald-600">{t("admin.user.successRemove")}</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-espresso">📋 {t("admin.user.registeredUsers")}</h2>
        {users.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#e0d3bc] bg-white/50 p-8 text-center text-sm text-espresso/50">
            {t("admin.user.noUsers")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#eee3d2] bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-sand/50 text-xs uppercase tracking-wide text-espresso/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("profile.displayName")}</th>
                  <th className="px-4 py-3 font-semibold">{t("profile.email")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.user.role")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin.user.joinedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-[#f0e7d8]">
                    <td className="px-4 py-2.5 font-medium text-espresso">
                      {u.display_name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-espresso/70">{u.email ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={u.role === "admin" ? "rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold" : "text-espresso/50"}>
                        {u.role === "admin" ? t("admin.user.adminRole") : t("admin.user.userRole")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-espresso/50">{fmt(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
