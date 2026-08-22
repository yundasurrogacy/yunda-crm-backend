"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { BindLoginUserModal } from "./BindLoginUserModal";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Kind = "case_manager" | "intended_parent" | "surrogate_mother";
type Row = {
  entityId: string;
  userId: string | null;
  email: string;
  deleted_at: string | null;
  caseCount?: number;
};

type ModalState = { entityId: string; mode: "bind" | "rebind" };

export function AdminAccountManager({ kind }: { kind: Kind }) {
  const { t } = useTranslation("portal");
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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
  }, [kind, page, pageSize, includeDeleted]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const showProfileActions = kind === "intended_parent" || kind === "surrogate_mother";
  const canCreateEntity = true;
  const showCaseCount = kind === "case_manager";
  const detailBase =
    kind === "intended_parent" ? "/admin/accounts/intended-parents" : "/admin/accounts/surrogates";
  const colspan = 6 + (showCaseCount ? 1 : 0);

  async function onCreateEntity(e: React.FormEvent) {
    e.preventDefault();
    if (!createEmail.trim()) return;
    setCreating(true);
    setMessage(null);
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
        setMessage(
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
      setMessage(t("admin_accounts.created_entity", { id: json.id ?? "" }));
      setPage(1);
      await load();
    } catch {
      setMessage(t("admin_accounts.error_create_entity"));
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
    <div className="space-y-6">
      <section className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6">
        <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t(`admin_accounts.title_${kind}`)}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-sage-700">
          {showProfileActions
            ? t("admin_accounts.intro_with_profile")
            : t("admin_accounts.intro_case_manager")}
        </p>
        <p className="mt-1 max-w-3xl text-xs text-sage-600">{t("admin_accounts.soft_delete_hint")}</p>

        {canCreateEntity ? (
          <form
            className="mt-4 grid gap-3 rounded-lg border border-dashed border-sage-300 bg-sage-50/50 p-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => void onCreateEntity(e)}
          >
            <p className="sm:col-span-2 lg:col-span-4 text-xs font-semibold uppercase tracking-wide text-sage-600">
              {kind === "case_manager"
                ? t("admin_accounts.create_cm_title")
                : t("admin_accounts.create_entity_title")}
            </p>
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
              <p className="text-sm text-sage-700 self-end pb-2">{t("admin_accounts.create_cm_hint")}</p>
            )}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating || !createEmail.trim()}
                className="rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {creating
                  ? t("admin_accounts.creating_entity")
                  : kind === "case_manager"
                    ? t("admin_accounts.create_cm_submit")
                    : t("admin_accounts.create_entity_submit")}
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin_accounts.search_placeholder")}
            className="min-w-[12rem] flex-1 rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setPage(1);
              void load();
            }}
            className="rounded-md bg-sage-700 px-3 py-2 text-sm font-semibold text-white"
          >
            {t("admin_accounts.search")}
          </button>
          <label className="inline-flex items-center gap-2 text-xs text-sage-700">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked);
                setPage(1);
              }}
            />
            {t("admin_accounts.show_deleted")}
          </label>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-sage-200/80 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-sage-200 bg-sage-100 text-xs font-semibold uppercase tracking-wide text-sage-700">
                <th className="px-4 py-3">{t("admin_accounts.col_entity_id")}</th>
                <th className="px-4 py-3">{t("admin_accounts.col_user_id")}</th>
                <th className="px-4 py-3">{t("admin_accounts.col_email")}</th>
                {showCaseCount ? (
                  <th className="px-4 py-3 text-right">{t("admin_accounts.col_case_count")}</th>
                ) : null}
                <th className="px-4 py-3">{t("admin_accounts.col_status")}</th>
                <th className="px-4 py-3">{t("admin_accounts.col_bind_login")}</th>
                <th className="px-4 py-3">{t("admin_accounts.col_actions")}</th>
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
                      <td className="px-4 py-3">{r.entityId}</td>
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
                            className="rounded-md border border-sage-400 bg-white px-3 py-1.5 text-xs font-semibold text-sage-800 hover:bg-sage-50"
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
                            className="rounded-md border border-brand-brown bg-brand-brown/10 px-3 py-1.5 text-xs font-semibold text-brand-brown hover:bg-brand-brown/20"
                          >
                            {t("admin_accounts.btn_bind")}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {showCaseCount && !isDeleted ? (
                            <Link
                              href={`/admin/cases?stage=all&caseManagerId=${encodeURIComponent(r.entityId)}`}
                              className="rounded-md border border-sage-500 bg-sage-50 px-3 py-1.5 text-xs font-semibold text-sage-900 hover:bg-sage-100"
                            >
                              {t("admin_accounts.btn_view_cases")}
                            </Link>
                          ) : null}
                          {showProfileActions && !isDeleted ? (
                            <Link
                              href={`${detailBase}/${r.entityId}`}
                              className="rounded-md border border-sage-500 bg-sage-50 px-3 py-1.5 text-xs font-semibold text-sage-900 hover:bg-sage-100"
                            >
                              {t("admin_accounts.btn_view_profile")}
                            </Link>
                          ) : null}
                          {isDeleted ? (
                            <button
                              type="button"
                              disabled={busyId === r.entityId}
                              onClick={() => void onSoftDelete(r, false)}
                              className="rounded-md border border-emerald-700 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
                            >
                              {t("admin_accounts.btn_restore")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === r.entityId}
                              onClick={() => void onSoftDelete(r, true)}
                              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
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
        <div className="mt-3 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            className="rounded border border-sage-300 bg-white px-2 py-1 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("admin_accounts.prev")}
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
            {t("admin_accounts.next")}
          </button>
        </div>
      </section>

      {message ? <p className="text-sm text-sage-800">{message}</p> : null}

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
    </div>
  );
}
