"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BindRoleKind } from "@/lib/admin/bind-user-role";
import { BindEntityToUserModal } from "@/components/admin/BindEntityToUserModal";
import { CrmModal } from "@/components/ui/CrmModal";
import { ListPager } from "@/components/ui/ListPager";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { useSyncedListQuery } from "@/lib/use-synced-list-query";

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
    <SelectMenu
      id={`${idPrefix}-role`}
      value={value}
      onChange={onChange}
      options={ROLE_VALUES.map((r) => ({
        value: r,
        label: t(labels[r] ?? r),
      }))}
    />
  );
}

export function AdminUsersManager() {
  const { t } = useTranslation("portal");
  const confirm = useConfirm();
  const { page, pageSize, q, replaceQuery } = useSyncedListQuery();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [qInput, setQInput] = useState(q);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [create, setCreate] = useState({
    email: "",
    password: "",
    role: "user",
  });
  const [edit, setEdit] = useState<{ userId: string; email: string; role: string; password: string } | null>(
    null,
  );
  const [bindModal, setBindModal] = useState<{
    userId: string;
    email: string;
    kind: BindRoleKind;
  } | null>(null);

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
    setQInput(q);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUnbind(userId: string, kind: BindRoleKind) {
    const confirmKey =
      kind === "case_manager"
        ? "admin_users.unbind_cm_confirm"
        : kind === "intended_parent"
          ? "admin_users.unbind_ip_confirm"
          : "admin_users.unbind_sm_confirm";
    if (!(await confirm({ message: t(confirmKey), danger: true }))) return;
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users/unbind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, kind }),
      });
      if (!res.ok) {
        setMessage(t("admin_users.error_unbind"));
        return;
      }
      setMessage(t("admin_users.unbind_ok"));
      await load();
    } catch {
      setMessage(t("admin_users.error_unbind"));
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: create.email,
          password: create.password,
          role: create.role,
        }),
      });
      if (!res.ok) {
        setCreateError(t("admin_users.error_create"));
        return;
      }
      setCreate({ email: "", password: "", role: "user" });
      setCreateOpen(false);
      setMessage(t("admin_users.create_ok"));
      await load();
    } catch {
      setCreateError(t("admin_users.error_create"));
    } finally {
      setCreating(false);
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
  const displayPage = Math.min(page, totalPages);

  useEffect(() => {
    if (loading || page <= totalPages) return;
    replaceQuery({ page: totalPages });
  }, [loading, page, replaceQuery, totalPages]);

  return (
    <div className="crm-fill-page ami-ui crm-font-ui">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t("admin_users.title")}</h1>
          <p className="mt-1 text-sm text-sage-700">{t("admin_users.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          className="crm-btn crm-btn-primary crm-btn-sm"
        >
          {t("admin_users.create_submit")}
        </button>
      </div>

      {message ? <p className="shrink-0 text-sm text-sage-900">{message}</p> : null}

      <section className="crm-card crm-card-list">
        <div className="crm-toolbar !py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sage-600">{t("admin_users.list_section")}</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  replaceQuery({ page: 1, q: qInput });
                }
              }}
              placeholder={t("admin_users.search_ph")}
              className="min-w-[200px] flex-1 rounded-md border border-sage-300 bg-white px-3 py-2 text-sm sm:flex-none sm:min-w-[220px]"
            />
            <button
              type="button"
              onClick={() => {
                if (qInput.trim() === q && page === 1) void load();
                else replaceQuery({ page: 1, q: qInput });
              }}
              className="crm-btn crm-btn-primary crm-btn-sm"
            >
              {t("admin_users.search_btn")}
            </button>
          </div>
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
              <button type="submit" className="crm-btn crm-btn-primary">
                {t("admin_users.save")}
              </button>
              <button type="button" onClick={() => setEdit(null)} className="crm-btn crm-btn-secondary">
                {t("admin_users.cancel")}
              </button>
            </div>
          </form>
        ) : null}

        <div className="crm-table-scroll">
          <table className="crm-table min-w-[960px]">
            <thead>
              <tr>
                <th className="crm-freeze-start">{t("admin_users.col_user_id")}</th>
                <th>{t("admin_users.col_email")}</th>
                <th>{t("admin_users.col_role")}</th>
                <th>{t("admin_users.col_cm")}</th>
                <th>{t("admin_users.col_ip")}</th>
                <th>{t("admin_users.col_sm")}</th>
                <th className="crm-freeze-end">{t("admin_users.col_actions")}</th>
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
                  <tr key={r.userId}>
                    <td className="crm-freeze-start tabular-nums">{r.userId}</td>
                    <td className="break-all">{r.email}</td>
                    <td>{r.role}</td>
                    <td className="tabular-nums">{r.caseManagerId ?? "—"}</td>
                    <td className="tabular-nums">{r.intendedParentId ?? "—"}</td>
                    <td className="tabular-nums">{r.surrogateId ?? "—"}</td>
                    <td className="crm-freeze-end">
                      <div className="flex flex-col items-stretch gap-1.5">
                        {r.caseManagerId ? (
                          <button
                            type="button"
                            onClick={() => void onUnbind(r.userId, "case_manager")}
                            className="crm-btn crm-btn-danger crm-btn-xs"
                          >
                            {t("admin_users.action_unbind_cm")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setBindModal({ userId: r.userId, email: r.email, kind: "case_manager" })
                            }
                            className="crm-btn crm-btn-secondary crm-btn-xs"
                          >
                            {t("admin_users.action_bind_cm")}
                          </button>
                        )}
                        {r.intendedParentId ? (
                          <button
                            type="button"
                            onClick={() => void onUnbind(r.userId, "intended_parent")}
                            className="crm-btn crm-btn-danger crm-btn-xs"
                          >
                            {t("admin_users.action_unbind_ip")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setBindModal({
                                userId: r.userId,
                                email: r.email,
                                kind: "intended_parent",
                              })
                            }
                            className="crm-btn crm-btn-secondary crm-btn-xs"
                          >
                            {t("admin_users.action_bind_ip")}
                          </button>
                        )}
                        {r.surrogateId ? (
                          <button
                            type="button"
                            onClick={() => void onUnbind(r.userId, "surrogate_mother")}
                            className="crm-btn crm-btn-danger crm-btn-xs"
                          >
                            {t("admin_users.action_unbind_sm")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setBindModal({
                                userId: r.userId,
                                email: r.email,
                                kind: "surrogate_mother",
                              })
                            }
                            className="crm-btn crm-btn-secondary crm-btn-xs"
                          >
                            {t("admin_users.action_bind_sm")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setEdit({ userId: r.userId, email: r.email, role: r.role, password: "" })
                          }
                          className="crm-btn crm-btn-secondary crm-btn-xs"
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
        <ListPager
          page={displayPage}
          totalPages={totalPages}
          pageSize={pageSize}
          disabled={loading}
          stats={t("admin_users.list_stats", {
            total,
            from: total === 0 ? 0 : (displayPage - 1) * pageSize + 1,
            to: Math.min(displayPage * pageSize, total),
          })}
          onPageChange={(next) => replaceQuery({ page: next })}
          onPageSizeChange={(size) => {
            replaceQuery({ page: 1, pageSize: size });
          }}
        />
      </section>

      {bindModal ? (
        <BindEntityToUserModal
          open
          userId={bindModal.userId}
          userEmail={bindModal.email}
          kind={bindModal.kind}
          onClose={() => setBindModal(null)}
          onBound={() => void load()}
          setBanner={setMessage}
        />
      ) : null}

      <CrmModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("admin_users.create_section")}
      >
        <form className="space-y-3 pb-20" onSubmit={onCreate}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-sage-700">{t("admin_users.lbl_email")}</span>
            <input
              required
              value={create.email}
              onChange={(e) => setCreate((p) => ({ ...p, email: e.target.value }))}
              type="email"
              autoComplete="off"
              placeholder={t("admin_users.ph_email")}
              disabled={creating}
              className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-sage-700">{t("admin_users.ph_password")}</span>
            <input
              required
              type="password"
              value={create.password}
              onChange={(e) => setCreate((p) => ({ ...p, password: e.target.value }))}
              autoComplete="new-password"
              placeholder="••••••••"
              disabled={creating}
              className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-sage-700">{t("admin_users.lbl_role")}</span>
            <RoleField
              idPrefix="create"
              value={create.role}
              onChange={(role) => setCreate((p) => ({ ...p, role }))}
            />
          </label>
          {createError ? <p className="text-sm text-red-700">{createError}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => setCreateOpen(false)} className="crm-btn crm-btn-secondary">
              {t("admin_users.cancel")}
            </button>
            <button type="submit" disabled={creating} className="crm-btn crm-btn-primary">
              {t("admin_users.create_submit")}
            </button>
          </div>
        </form>
      </CrmModal>
    </div>
  );
}
