"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BindRoleKind } from "@/lib/admin/bind-user-role";
import { BindEntityToUserModal } from "@/components/admin/BindEntityToUserModal";
import { CrmModal } from "@/components/ui/CrmModal";
import { ListPager } from "@/components/ui/ListPager";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { RecordFilterControl } from "@/components/ui/RecordFilterControl";
import { useSyncedListQuery } from "@/lib/use-synced-list-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseRecordFilterFromParams } from "@/constants/record-filter";
import {
  USER_BINDING_FILTERS,
  USER_BINDING_LABEL_KEY,
  USER_ROLE_FILTERS,
  USER_ROLE_LABEL_KEY,
  bindingFilterParam,
  parseUserBindingFilter,
  parseUserRoleFilter,
  roleFilterParam,
  type UserBindingFilter,
  type UserRoleFilter,
} from "@/constants/user-filters";

const ROLE_VALUES = ["user", "admin", "operator"] as const;

/** 表格里展示角色中文名；未知角色原样回退 */
function roleKeyOf(raw: string): UserRoleFilter {
  return (USER_ROLE_FILTERS as readonly string[]).includes(raw) ? (raw as UserRoleFilter) : "user";
}

/** 停用接口的错误码 → 文案 key */
function errorKeyForDisable(code: string | undefined): string {
  switch (code) {
    case "cannot_disable_self":
      return "admin_users.error_disable_self";
    case "last_admin":
      return "admin_users.error_disable_last_admin";
    case "not_found":
      return "admin_users.error_disable_not_found";
    default:
      return "admin_users.error_disable";
  }
}

type UserRow = {
  userId: string;
  email: string;
  role: string;
  createdAt: string;
  disabledAt: string | null;
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
  const { page, pageSize, q, href, replaceQuery } = useSyncedListQuery();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const role = parseUserRoleFilter(searchParams.get("role"));
  const binding = parseUserBindingFilter(searchParams.get("binding"));
  const status = parseRecordFilterFromParams(searchParams.get("status"));
  const [rows, setRows] = useState<UserRow[]>([]);
  const [qInput, setQInput] = useState(q);
  const [total, setTotal] = useState(0);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
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
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
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
      if (role !== "all") url.searchParams.set("role", role);
      if (binding !== "all") url.searchParams.set("binding", binding);
      if (status !== "active") url.searchParams.set("status", status);
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
  }, [page, pageSize, q, role, binding, status, t]);

  /** 切换角色 / 绑定状态 / 账号状态筛选：写 URL 并回到第 1 页 */
  const setFilterParam = useCallback(
    (key: "role" | "binding" | "status", value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const isDefault = key === "status" ? value === "active" : value === "all";
      if (isDefault) params.delete(key);
      else params.set(key, value);
      params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setQInput(q);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 停用 / 恢复账号：停用后该账号立即无法登录，且进行中的会话立即失效 */
  async function onToggleDisabled(userId: string, email: string, disabled: boolean) {
    const ok = await confirm({
      message: t(disabled ? "admin_users.disable_confirm" : "admin_users.enable_confirm", {
        email,
      }),
      danger: disabled,
    });
    if (!ok) return;
    setMessage(null);
    setBusyUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/disabled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(t(errorKeyForDisable(json.error)));
        return;
      }
      await load();
      setMessage(t(disabled ? "admin_users.disable_ok" : "admin_users.enable_ok", { email }));
    } catch {
      setMessage(t("admin_users.error_disable"));
    } finally {
      setBusyUserId(null);
    }
  }

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
    if (!edit || editSaving) return;
    setMessage(null);
    setEditError(null);
    setEditSaving(true);
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
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setEditError(
          json.error === "last_admin"
            ? t("admin_users.error_demote_last_admin")
            : t("admin_users.error_update"),
        );
        return;
      }
      setEdit(null);
      setMessage(t("admin_users.update_ok"));
      await load();
    } catch {
      setEditError(t("admin_users.error_update"));
    } finally {
      setEditSaving(false);
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
            <div className="flex items-center gap-1.5 text-xs text-sage-700">
              <span className="shrink-0">{t("admin_users.filter_role")}</span>
              <SelectMenu
                id="users-filter-role"
                compact
                className="min-w-[7.5rem]"
                value={role}
                disabled={loading}
                onChange={(v) => setFilterParam("role", v)}
                options={USER_ROLE_FILTERS.map((r) => ({
                  value: r,
                  label: t(USER_ROLE_LABEL_KEY[r]),
                }))}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-sage-700">
              <span className="shrink-0">{t("admin_users.filter_binding")}</span>
              <SelectMenu
                id="users-filter-binding"
                compact
                className="min-w-[8.5rem]"
                value={binding}
                disabled={loading}
                onChange={(v) => setFilterParam("binding", v)}
                options={USER_BINDING_FILTERS.map((b) => ({
                  value: b,
                  label: t(USER_BINDING_LABEL_KEY[b]),
                }))}
              />
            </div>
            <RecordFilterControl
              value={status}
              disabled={loading}
              deletedLabel={t("admin_users.filter_status_disabled")}
              onChange={(v) => setFilterParam("status", v)}
            />
          </div>
        </div>
        </div>

        <div className="crm-table-scroll">
          <table className="crm-table min-w-[960px]">
            <thead>
              <tr>
                <th className="crm-freeze-start">{t("admin_users.col_user_id")}</th>
                <th>{t("admin_users.col_email")}</th>
                <th>{t("admin_users.col_role")}</th>
                <th>{t("admin_users.col_status")}</th>
                <th>{t("admin_users.col_cm")}</th>
                <th>{t("admin_users.col_ip")}</th>
                <th>{t("admin_users.col_sm")}</th>
                <th className="crm-freeze-end">{t("admin_users.col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-sage-600">
                    {t("admin_users.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-sage-600">
                    {t("admin_users.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.userId}>
                    <td className="crm-freeze-start tabular-nums">{r.userId}</td>
                    <td className="break-all">{r.email}</td>
                    <td>{t(USER_ROLE_LABEL_KEY[roleKeyOf(r.role)])}</td>
                    <td>
                      {r.disabledAt ? (
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700">
                          {t("admin_users.status_disabled")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-sage-100 text-sage-700">
                          {t("admin_users.status_active")}
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums">{r.caseManagerId ?? "—"}</td>
                    <td className="tabular-nums">{r.intendedParentId ?? "—"}</td>
                    <td className="tabular-nums">{r.surrogateId ?? "—"}</td>
                    <td className="crm-freeze-end">
                      <div className="flex flex-col items-stretch gap-1.5">
                        <button
                          type="button"
                          disabled={busyUserId === r.userId}
                          onClick={() => void onToggleDisabled(r.userId, r.email, !r.disabledAt)}
                          className={
                            r.disabledAt
                              ? "crm-btn crm-btn-secondary crm-btn-xs"
                              : "crm-btn crm-btn-danger crm-btn-xs"
                          }
                        >
                          {r.disabledAt
                            ? t("admin_users.action_enable")
                            : t("admin_users.action_disable")}
                        </button>
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
                          onClick={() => {
                            setEditError(null);
                            setEdit({ userId: r.userId, email: r.email, role: r.role, password: "" });
                          }}
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
      <CrmModal
        open={Boolean(edit)}
        onClose={() => {
          if (editSaving) return;
          setEdit(null);
        }}
        title={edit ? t("admin_users.edit_user", { id: edit.userId }) : t("admin_users.action_edit")}
      >
        {edit ? (
          <form className="space-y-3 pb-20" onSubmit={(e) => void onSaveEdit(e)}>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-sage-700">{t("admin_users.lbl_email")}</span>
              <input
                value={edit.email}
                onChange={(e) => setEdit((p) => (p ? { ...p, email: e.target.value } : p))}
                type="email"
                disabled={editSaving}
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
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-sage-700">{t("admin_users.lbl_password_reset")}</span>
              <input
                value={edit.password}
                onChange={(e) => setEdit((p) => (p ? { ...p, password: e.target.value } : p))}
                type="password"
                autoComplete="new-password"
                placeholder={t("admin_users.ph_password_optional")}
                disabled={editSaving}
                className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            {editError ? <p className="text-sm text-red-700">{editError}</p> : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={editSaving}
                onClick={() => setEdit(null)}
                className="crm-btn crm-btn-secondary"
              >
                {t("admin_users.cancel")}
              </button>
              <button type="submit" disabled={editSaving} className="crm-btn crm-btn-primary">
                {t("admin_users.save")}
              </button>
            </div>
          </form>
        ) : null}
      </CrmModal>
    </div>
  );
}
