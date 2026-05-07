"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BindRoleKind } from "@/lib/admin/bind-user-role";

const ROLE_VALUES = ["user", "admin", "operator"] as const;

type UserRow = {
  userId: string;
  email: string;
  role: string;
  createdAt: string;
  caseManagerId: string | null;
  intendedParentId: string | null;
  surrogateId: string | null;
};

function RoleField({
  value,
  onChange,
  idPrefix,
}: {
  value: string;
  onChange: (v: string) => void;
  idPrefix: string;
}) {
  const { t } = useTranslation("portal");
  const labels: Record<string, string> = {
    user: "admin_users.role_user",
    admin: "admin_users.role_admin",
    operator: "admin_users.role_operator",
  };
  return (
    <select
      id={`${idPrefix}-role`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
    >
      {ROLE_VALUES.map((r) => (
        <option key={r} value={r}>
          {t(labels[r] ?? r)}
        </option>
      ))}
    </select>
  );
}

export function AdminUsersManager() {
  const { t } = useTranslation("portal");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [create, setCreate] = useState({
    email: "",
    password: "",
    role: "user",
    bindCm: false,
    bindIp: false,
    bindSm: false,
  });
  const [edit, setEdit] = useState<{ userId: string; email: string; role: string; password: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/users", window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));
      if (q.trim()) url.searchParams.set("q", q.trim());
      const res = await fetch(url.pathname + url.search);
      if (!res.ok) throw new Error("load");
      const json = (await res.json()) as { rows: UserRow[]; total: number };
      setRows(json.rows ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setMessage(t("admin_users.error_load"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onBind(userId: string, kind: BindRoleKind) {
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, kind }),
      });
      if (!res.ok) {
        setMessage(t("admin_users.error_bind"));
        return;
      }
      const json = (await res.json()) as { alreadyLinked?: boolean };
      setMessage(json.alreadyLinked ? t("admin_users.bind_already") : t("admin_users.bind_ok"));
      await load();
    } catch {
      setMessage(t("admin_users.error_bind"));
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const bind: BindRoleKind[] = [];
    if (create.bindCm) bind.push("case_manager");
    if (create.bindIp) bind.push("intended_parent");
    if (create.bindSm) bind.push("surrogate_mother");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: create.email,
          password: create.password,
          role: create.role,
          bind,
        }),
      });
      if (!res.ok) {
        setMessage(t("admin_users.error_create"));
        return;
      }
      setCreate({ email: "", password: "", role: "user", bindCm: false, bindIp: false, bindSm: false });
      setMessage(t("admin_users.create_ok"));
      await load();
    } catch {
      setMessage(t("admin_users.error_create"));
    }
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setMessage(null);
    try {
      const body: { userId: string; email?: string; role?: string; password?: string } = {
        userId: edit.userId,
      };
      if (edit.email.trim()) body.email = edit.email.trim();
      if (edit.role.trim()) body.role = edit.role.trim();
      if (edit.password.trim()) body.password = edit.password.trim();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setMessage(t("admin_users.error_update"));
        return;
      }
      setEdit(null);
      setMessage(t("admin_users.update_ok"));
      await load();
    } catch {
      setMessage(t("admin_users.error_update"));
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-xl border border-sage-200/80 bg-white/50 shadow-sm">
        <div className="border-b border-sage-200/80 px-4 py-4 md:px-6">
          <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t("admin_users.title")}</h1>
          <p className="mt-1 text-xs leading-snug text-sage-600">{t("admin_users.subtitle")}</p>
        </div>

        <div className="border-b border-sage-200/80 px-4 py-4 md:px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sage-600">{t("admin_users.create_section")}</h2>
          <form className="mt-3 space-y-3" onSubmit={onCreate}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
              <label className="flex flex-col gap-1 text-sm lg:col-span-4">
                <span className="text-xs font-medium text-sage-700">{t("admin_users.lbl_email")}</span>
                <input
                  required
                  value={create.email}
                  onChange={(e) => setCreate((p) => ({ ...p, email: e.target.value }))}
                  type="email"
                  autoComplete="off"
                  placeholder={t("admin_users.ph_email")}
                  className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm lg:col-span-4">
                <span className="text-xs font-medium text-sage-700">{t("admin_users.ph_password")}</span>
                <input
                  required
                  type="password"
                  value={create.password}
                  onChange={(e) => setCreate((p) => ({ ...p, password: e.target.value }))}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm lg:col-span-4">
                <span className="text-xs font-medium text-sage-700">{t("admin_users.lbl_role")}</span>
                <RoleField
                  idPrefix="create"
                  value={create.role}
                  onChange={(role) => setCreate((p) => ({ ...p, role }))}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-sage-800">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={create.bindCm}
                  onChange={(e) => setCreate((p) => ({ ...p, bindCm: e.target.checked }))}
                  className="rounded border-sage-400"
                />
                {t("admin_users.bind_opt_cm")}
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={create.bindIp}
                  onChange={(e) => setCreate((p) => ({ ...p, bindIp: e.target.checked }))}
                  className="rounded border-sage-400"
                />
                {t("admin_users.bind_opt_ip")}
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={create.bindSm}
                  onChange={(e) => setCreate((p) => ({ ...p, bindSm: e.target.checked }))}
                  className="rounded border-sage-400"
                />
                {t("admin_users.bind_opt_sm")}
              </label>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-white">
                {t("admin_users.create_submit")}
              </button>
            </div>
          </form>
        </div>

        <div className="px-4 py-4 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-sage-600">{t("admin_users.list_section")}</h2>
            <div className="flex flex-wrap gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("admin_users.search_ph")}
                className="min-w-[200px] flex-1 rounded-md border border-sage-300 bg-white px-3 py-2 text-sm sm:flex-none sm:min-w-[220px]"
              />
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  void load();
                }}
                className="rounded-md bg-sage-700 px-3 py-2 text-sm font-semibold text-white"
              >
                {t("admin_users.search_btn")}
              </button>
            </div>
          </div>

          {edit ? (
            <form
              className="mt-4 space-y-3 rounded-lg border border-sage-200 bg-sage-50/80 p-4"
              onSubmit={onSaveEdit}
            >
              <p className="text-sm font-semibold text-brand-brown">{t("admin_users.edit_user", { id: edit.userId })}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-sage-700">{t("admin_users.lbl_email")}</span>
                  <input
                    value={edit.email}
                    onChange={(e) => setEdit((p) => (p ? { ...p, email: e.target.value } : p))}
                    type="email"
                    className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-sage-700">{t("admin_users.lbl_role")}</span>
                  <RoleField
                    idPrefix="edit"
                    value={ROLE_VALUES.includes(edit.role as (typeof ROLE_VALUES)[number]) ? edit.role : "user"}
                    onChange={(role) => setEdit((p) => (p ? { ...p, role } : p))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  <span className="text-xs font-medium text-sage-700">{t("admin_users.lbl_password_reset")}</span>
                  <input
                    value={edit.password}
                    onChange={(e) => setEdit((p) => (p ? { ...p, password: e.target.value } : p))}
                    type="password"
                    autoComplete="new-password"
                    placeholder={t("admin_users.ph_password_optional")}
                    className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="rounded-md bg-sage-700 px-4 py-2 text-sm font-semibold text-white">
                  {t("admin_users.save")}
                </button>
                <button
                  type="button"
                  onClick={() => setEdit(null)}
                  className="rounded-md border border-sage-300 bg-white px-4 py-2 text-sm"
                >
                  {t("admin_users.cancel")}
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-4 overflow-x-auto rounded-lg border border-sage-200/80 bg-white">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-sage-200 bg-sage-100 text-xs font-semibold uppercase tracking-wide text-sage-700">
                  <th className="px-3 py-2.5">{t("admin_users.col_user_id")}</th>
                  <th className="px-3 py-2.5">{t("admin_users.col_email")}</th>
                  <th className="px-3 py-2.5">{t("admin_users.col_role")}</th>
                  <th className="px-3 py-2.5">{t("admin_users.col_cm")}</th>
                  <th className="px-3 py-2.5">{t("admin_users.col_ip")}</th>
                  <th className="px-3 py-2.5">{t("admin_users.col_sm")}</th>
                  <th className="px-3 py-2.5">{t("admin_users.col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-sage-600">
                      {t("admin_users.loading")}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-sage-600">
                      {t("admin_users.empty")}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.userId} className="border-b border-sage-100">
                      <td className="px-3 py-2.5 tabular-nums">{r.userId}</td>
                      <td className="px-3 py-2.5 break-all">{r.email}</td>
                      <td className="px-3 py-2.5">{r.role}</td>
                      <td className="px-3 py-2.5 tabular-nums">{r.caseManagerId ?? "—"}</td>
                      <td className="px-3 py-2.5 tabular-nums">{r.intendedParentId ?? "—"}</td>
                      <td className="px-3 py-2.5 tabular-nums">{r.surrogateId ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={!!r.caseManagerId}
                            onClick={() => void onBind(r.userId, "case_manager")}
                            className="text-left text-xs font-semibold text-brand-brown underline disabled:opacity-40"
                          >
                            {t("admin_users.action_bind_cm")}
                          </button>
                          <button
                            type="button"
                            disabled={!!r.intendedParentId}
                            onClick={() => void onBind(r.userId, "intended_parent")}
                            className="text-left text-xs font-semibold text-brand-brown underline disabled:opacity-40"
                          >
                            {t("admin_users.action_bind_ip")}
                          </button>
                          <button
                            type="button"
                            disabled={!!r.surrogateId}
                            onClick={() => void onBind(r.userId, "surrogate_mother")}
                            className="text-left text-xs font-semibold text-brand-brown underline disabled:opacity-40"
                          >
                            {t("admin_users.action_bind_sm")}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEdit({ userId: r.userId, email: r.email, role: r.role, password: "" })
                            }
                            className="text-left text-xs font-semibold text-sage-800 underline"
                          >
                            {t("admin_users.action_edit")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-xs">
            <button
              type="button"
              className="rounded border border-sage-300 bg-white px-2 py-1 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t("admin_users.prev")}
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              className="rounded border border-sage-300 bg-white px-2 py-1 disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("admin_users.next")}
            </button>
          </div>
        </div>
      </section>

      {message ? <p className="text-sm text-sage-900">{message}</p> : null}
    </div>
  );
}
