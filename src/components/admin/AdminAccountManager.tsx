"use client";

import { Link } from "@/components/ui/AppLink";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { BindLoginUserModal } from "./BindLoginUserModal";
import { CrmModal } from "@/components/ui/CrmModal";
import { ListPager } from "@/components/ui/ListPager";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { rememberListReturn, restoreMainScroll } from "@/lib/crm-list-return";
import { hrefWithReturnTo, useSyncedListQuery } from "@/lib/use-synced-list-query";

type Kind = "case_manager" | "intended_parent" | "surrogate_mother";
type Row = {
  entityId: string;
  userId: string | null;
  email: string;
  displayName?: string;
  deleted_at: string | null;
  caseCount?: number;
};

type ModalState = { entityId: string; mode: "bind" | "rebind" };

export function AdminAccountManager({ kind }: { kind: Kind }) {
  const { t } = useTranslation("portal");
  const confirm = useConfirm();
  const { page, pageSize, q, includeDeleted, href, replaceQuery } = useSyncedListQuery();
  const [rows, setRows] = useState<Row[]>([]);
  const [qInput, setQInput] = useState(q);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const didRestoreScroll = useRef(false);

  useEffect(() => {
    setQInput(q);
  }, [q]);

  async function load() {
    setLoading(true);
    try {
      const url = new URL("/api/admin/accounts", window.location.origin);
      url.searchParams.set("kind", kind);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));
      if (q.trim()) url.searchParams.set("q", q.trim());
      if (includeDeleted) url.searchParams.set("includeDeleted", "1");
      const res = await fetch(url.pathname + url.search);
      if (!res.ok) throw new Error("load_failed");
      const json = (await res.json()) as { rows: Row[]; total: number };
      setRows(json.rows ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setMessage(t("admin_accounts.error_load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, page, pageSize, q, includeDeleted]);

  useEffect(() => {
    if (didRestoreScroll.current || loading) return;
    didRestoreScroll.current = true;
    restoreMainScroll(href);
  }, [href, loading]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const displayPage = Math.min(page, totalPages);

  useEffect(() => {
    if (loading || page <= totalPages) return;
    replaceQuery({ page: totalPages });
  }, [loading, page, replaceQuery, totalPages]);

  const showProfileActions = kind === "intended_parent" || kind === "surrogate_mother";
  const canCreateEntity = true;
  const showCaseCount = kind === "case_manager";
  const showDisplayName = kind === "intended_parent" || kind === "surrogate_mother";
  const detailBase =
    kind === "intended_parent" ? "/admin/accounts/intended-parents" : "/admin/accounts/surrogates";
  const colspan = 6 + (showCaseCount ? 1 : 0) + (showDisplayName ? 1 : 0);

  const createTitle =
    kind === "case_manager"
      ? t("admin_accounts.create_cm_title")
      : kind === "intended_parent"
        ? t("admin_accounts.create_ip_title")
        : t("admin_accounts.create_gc_title");
  const createSubmit =
    kind === "case_manager"
      ? t("admin_accounts.create_cm_submit")
      : kind === "intended_parent"
        ? t("admin_accounts.create_ip_submit")
        : t("admin_accounts.create_gc_submit");

  async function onCreateEntity(e: React.FormEvent) {
    e.preventDefault();
    if (!createEmail.trim()) return;
    setCreating(true);
    setMessage(null);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "case_manager"
            ? { kind, email: createEmail }
            : {
                kind,
                email: createEmail,
                displayName: createName,
              },
        ),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setCreateError(
          json.error === "bad_email"
            ? t("admin_accounts.error_email")
            : json.error === "email_taken"
              ? t("admin_accounts.error_email_taken")
              : t("admin_accounts.error_create_entity"),
        );
        return;
      }
      setCreateEmail("");
      setCreateName("");
      setCreateOpen(false);
      setMessage(t("admin_accounts.created_entity", { id: json.id ?? "" }));
      replaceQuery({ page: 1 });
      await load();
    } catch {
      setCreateError(t("admin_accounts.error_create_entity"));
    } finally {
      setCreating(false);
    }
  }

  async function onSoftDelete(row: Row, deleted: boolean) {
    if (busyId) return;
    const ok = await confirm({
      message: deleted ? t("admin_accounts.soft_delete_confirm") : t("admin_accounts.restore_confirm"),
      danger: deleted,
    });
    if (!ok) return;
    setBusyId(row.entityId);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/accounts/${encodeURIComponent(kind)}/${encodeURIComponent(row.entityId)}/soft-delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deleted }),
        },
      );
      if (!res.ok) {
        setMessage(t("admin_accounts.error_soft_delete"));
        return;
      }
      setMessage(deleted ? t("admin_accounts.soft_deleted_ok") : t("admin_accounts.restored_ok"));
      await load();
    } catch {
      setMessage(t("admin_accounts.error_soft_delete"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="crm-fill-page ami-ui crm-font-ui">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t(`admin_accounts.title_${kind}`)}</h1>
          <p className="mt-1 text-sm leading-relaxed text-sage-700">
            {showProfileActions
              ? t("admin_accounts.intro_with_profile")
              : t("admin_accounts.intro_case_manager")}
          </p>
          <p className="mt-1 text-xs text-sage-600">{t("admin_accounts.soft_delete_hint")}</p>
        </div>
        {canCreateEntity ? (
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setCreateOpen(true);
            }}
            className="crm-btn crm-btn-primary crm-btn-sm"
          >
            {createSubmit}
          </button>
        ) : null}
      </div>

      {message ? <p className="shrink-0 text-sm text-sage-800">{message}</p> : null}

      <section className="crm-card crm-card-list">
        <div className="crm-toolbar !py-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                replaceQuery({ page: 1, q: qInput });
              }
            }}
            placeholder={t("admin_accounts.search_placeholder")}
            className="min-w-[12rem] flex-1 rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (qInput.trim() === q && page === 1) void load();
              else replaceQuery({ page: 1, q: qInput });
            }}
            className="crm-btn crm-btn-primary crm-btn-sm"
          >
            {t("admin_accounts.search")}
          </button>
          <label className="inline-flex items-center gap-2 text-xs text-sage-700">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                replaceQuery({ page: 1, includeDeleted: e.target.checked });
              }}
            />
            {t("admin_accounts.show_deleted")}
          </label>
        </div>
        </div>
        <div className="crm-table-scroll">
          <table className="crm-table min-w-[640px]">
            <thead>
              <tr>
                <th className="crm-freeze-start">{t("admin_accounts.col_entity_id")}</th>
                {showDisplayName ? (
                  <th className="px-4 py-3">{t("admin_accounts.col_name")}</th>
                ) : null}
                <th className="px-4 py-3">{t("admin_accounts.col_user_id")}</th>
                <th className="px-4 py-3">{t("admin_accounts.col_email")}</th>
                {showCaseCount ? (
                  <th className="px-4 py-3 text-right">{t("admin_accounts.col_case_count")}</th>
                ) : null}
                <th className="px-4 py-3">{t("admin_accounts.col_status")}</th>
                <th className="px-4 py-3">{t("admin_accounts.col_bind_login")}</th>
                <th className="crm-freeze-end">{t("admin_accounts.col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sage-600" colSpan={colspan}>
                    {t("admin_accounts.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sage-600" colSpan={colspan}>
                    {t("admin_accounts.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isDeleted = Boolean(r.deleted_at);
                  return (
                    <tr
                      key={r.entityId}
                      className={[
                        "border-b border-sage-100",
                        isDeleted ? "bg-sage-50/80 text-sage-500" : "",
                      ].join(" ")}
                    >
                      <td className="crm-freeze-start">{r.entityId}</td>
                      {showDisplayName ? (
                        <td className="px-4 py-3 font-medium text-sage-900">
                          {r.displayName || "—"}
                        </td>
                      ) : null}
                      <td className="px-4 py-3">{r.userId ?? "—"}</td>
                      <td className="px-4 py-3">{r.email || "—"}</td>
                      {showCaseCount ? (
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-sage-900">
                          {typeof r.caseCount === "number" ? r.caseCount : "—"}
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        {isDeleted ? (
                          <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
                            {t("admin_accounts.status_deleted")}
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            {t("admin_accounts.status_active")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isDeleted ? (
                          "—"
                        ) : r.userId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setMessage(null);
                              setModal({ entityId: r.entityId, mode: "rebind" });
                            }}
                            className="crm-btn crm-btn-secondary crm-btn-xs"
                          >
                            {t("admin_accounts.btn_rebind")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setMessage(null);
                              setModal({ entityId: r.entityId, mode: "bind" });
                            }}
                            className="crm-btn crm-btn-primary crm-btn-xs"
                          >
                            {t("admin_accounts.btn_bind")}
                          </button>
                        )}
                      </td>
                      <td className="crm-freeze-end">
                        <div className="flex flex-wrap gap-2">
                          {showCaseCount && !isDeleted ? (
                            <Link
                              href={`/admin/cases?stage=all&caseManagerId=${encodeURIComponent(r.entityId)}`}
                              className="crm-btn crm-btn-secondary crm-btn-xs"
                            >
                              {t("admin_accounts.btn_view_cases")}
                            </Link>
                          ) : null}
                          {showProfileActions && !isDeleted ? (
                            <Link
                              href={hrefWithReturnTo(`${detailBase}/${r.entityId}`, href)}
                              onClick={() => rememberListReturn(href)}
                              className="crm-btn crm-btn-secondary crm-btn-xs"
                            >
                              {t("admin_accounts.btn_view_profile")}
                            </Link>
                          ) : null}
                          {isDeleted ? (
                            <button
                              type="button"
                              disabled={busyId === r.entityId}
                              onClick={() => void onSoftDelete(r, false)}
                              className="crm-btn crm-btn-secondary crm-btn-xs"
                            >
                              {t("admin_accounts.btn_restore")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === r.entityId}
                              onClick={() => void onSoftDelete(r, true)}
                              className="crm-btn crm-btn-danger crm-btn-xs"
                            >
                              {t("admin_accounts.btn_soft_delete")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <ListPager
          page={displayPage}
          totalPages={totalPages}
          pageSize={pageSize}
          disabled={loading}
          stats={t("admin_accounts.list_stats", {
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

      {modal ? (
        <BindLoginUserModal
          open
          kind={kind}
          entityId={modal.entityId}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onLinked={() => void load()}
          setBanner={setMessage}
        />
      ) : null}

      <CrmModal open={createOpen} onClose={() => setCreateOpen(false)} title={createTitle}>
        <form className="space-y-3" onSubmit={(e) => void onCreateEntity(e)}>
          <label className="block text-xs font-medium text-sage-700">
            {t("admin_accounts.field_entity_email")}
            <input
              type="email"
              required
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              disabled={creating}
              className="mt-1 w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          {showProfileActions ? (
            <label className="block text-xs font-medium text-sage-700">
              {t("admin_accounts.field_entity_name")}
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                disabled={creating}
                className="mt-1 w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          ) : (
            <p className="text-sm text-sage-700">{t("admin_accounts.create_cm_hint")}</p>
          )}
          {createError ? <p className="text-sm text-red-700">{createError}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => setCreateOpen(false)} className="crm-btn crm-btn-secondary">
              {t("confirm_dialog.cancel")}
            </button>
            <button
              type="submit"
              disabled={creating || !createEmail.trim()}
              className="crm-btn crm-btn-primary"
            >
              {creating ? t("admin_accounts.creating_entity") : createSubmit}
            </button>
          </div>
        </form>
      </CrmModal>
    </div>
  );
}
