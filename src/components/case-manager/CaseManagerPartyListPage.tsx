"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EntityKind } from "@/lib/admin/entity-profile";
import type { PartyListRow } from "@/lib/party/list-cm-parties";
import { CrmModal } from "@/components/ui/CrmModal";
import { ListPager } from "@/components/ui/ListPager";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from "@/lib/crm-pagination";

export function CaseManagerPartyListPage({ kind }: { kind: EntityKind }) {
  const { t } = useTranslation("portal");
  const confirm = useConfirm();
  const [rows, setRows] = useState<PartyListRow[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const detailBase =
    kind === "intended_parent"
      ? "/case_manager/parties/intended-parents"
      : "/case_manager/parties/surrogates";

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(async (pageOverride?: number) => {
    const pageToUse = pageOverride ?? page;
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/case-manager/parties", window.location.origin);
      url.searchParams.set("kind", kind);
      url.searchParams.set("page", String(pageToUse));
      url.searchParams.set("pageSize", String(pageSize));
      if (q.trim()) url.searchParams.set("q", q.trim());
      if (includeDeleted) url.searchParams.set("includeDeleted", "1");
      const res = await fetch(url.pathname + url.search);
      if (!res.ok) throw new Error("load");
      const json = (await res.json()) as {
        rows?: PartyListRow[];
        total?: number;
        page?: number;
      };
      setRows(json.rows ?? []);
      setTotal(json.total ?? 0);
      if (typeof json.page === "number" && json.page !== pageToUse) {
        setPage(json.page);
      }
    } catch {
      setError(t("cm_parties.error_load"));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [kind, q, includeDeleted, page, pageSize, t]);

  useEffect(() => {
    void load();
  }, [kind, includeDeleted, page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps -- search via button

  async function onSoftDelete(row: PartyListRow, deleted: boolean) {
    if (busyId) return;
    const ok = await confirm({
      message: deleted ? t("cm_parties.soft_delete_confirm") : t("cm_parties.restore_confirm"),
      danger: deleted,
    });
    if (!ok) return;
    setBusyId(row.entityId);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/case-manager/parties/${encodeURIComponent(kind)}/${encodeURIComponent(row.entityId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ soft_deleted: deleted }),
        },
      );
      if (!res.ok) {
        setError(t("cm_parties.error_soft_delete"));
        return;
      }
      setMessage(deleted ? t("cm_parties.soft_deleted_ok") : t("cm_parties.restored_ok"));
      await load();
    } catch {
      setError(t("cm_parties.error_soft_delete"));
    } finally {
      setBusyId(null);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    setError(null);
    setCreateError(null);
    try {
      const res = await fetch("/api/case-manager/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, email, displayName }),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setCreateError(
          json.error === "bad_email"
            ? t("cm_parties.error_email")
            : json.error === "email_taken"
              ? t("cm_parties.error_email_taken")
              : json.error === "case_manager_not_bound"
                ? t("cm_parties.error_cm_not_bound")
                : t("cm_parties.error_create"),
        );
        return;
      }
      setEmail("");
      setDisplayName("");
      setCreateOpen(false);
      setMessage(t("cm_parties.created", { id: json.id ?? "" }));
      setPage(1);
      await load(1);
    } catch {
      setCreateError(t("cm_parties.error_create"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="ami-ui crm-font-ui crm-fill-page">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">
            {t(`cm_parties.title_${kind}`)}
          </h1>
          <p className="mt-1 text-sm text-sage-700">{t("cm_parties.intro")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          className="crm-btn crm-btn-primary crm-btn-sm"
        >
          {t("cm_parties.create_submit")}
        </button>
      </div>

      {error ? <p className="shrink-0 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="shrink-0 text-sm text-emerald-800">{message}</p> : null}

      <section className="crm-card crm-card-list">
        <div className="crm-toolbar !py-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setPage(1);
                void load(1);
              }
            }}
            placeholder={t("cm_parties.search_placeholder")}
            className="min-w-[12rem] flex-1 rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setPage(1);
              void load(1);
            }}
            className="crm-btn crm-btn-primary crm-btn-sm"
          >
            {t("cm_parties.search")}
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
            {t("cm_parties.show_deleted")}
          </label>
        </div>
        </div>

        <div className="crm-table-scroll">
          <table className="crm-table min-w-[36rem]">
            <thead>
              <tr>
                <th className="crm-freeze-start">{t("cm_parties.col_id")}</th>
                <th>{t("cm_parties.col_name")}</th>
                <th>{t("cm_parties.col_email")}</th>
                <th>{t("cm_parties.col_source")}</th>
                <th>{t("cm_parties.col_status")}</th>
                <th className="crm-freeze-end">{t("cm_parties.col_action")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sage-600">
                    {t("cm_parties.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sage-600">
                    {t("cm_parties.empty")}
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
                      <td className="crm-freeze-start tabular-nums">{r.entityId}</td>
                      <td className="px-4 py-3">{r.displayName}</td>
                      <td className="px-4 py-3 break-all">{r.email || "—"}</td>
                      <td className="px-4 py-3 text-xs text-sage-700">
                        {r.source === "created"
                          ? t("cm_parties.source_created")
                          : t("cm_parties.source_case")}
                      </td>
                      <td className="px-4 py-3">
                        {isDeleted ? (
                          <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
                            {t("cm_parties.status_deleted")}
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            {t("cm_parties.status_active")}
                          </span>
                        )}
                      </td>
                      <td className="crm-freeze-end">
                        <div className="flex flex-wrap gap-2">
                          {!isDeleted ? (
                            <Link
                              href={`${detailBase}/${r.entityId}`}
                              className="crm-btn crm-btn-secondary crm-btn-xs"
                            >
                              {t("cm_parties.view_profile")}
                            </Link>
                          ) : null}
                          {isDeleted ? (
                            <button
                              type="button"
                              disabled={busyId === r.entityId}
                              onClick={() => void onSoftDelete(r, false)}
                              className="crm-btn crm-btn-secondary crm-btn-xs"
                            >
                              {t("cm_parties.btn_restore")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === r.entityId}
                              onClick={() => void onSoftDelete(r, true)}
                              className="crm-btn crm-btn-danger crm-btn-xs"
                            >
                              {t("cm_parties.btn_soft_delete")}
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
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          disabled={loading}
          stats={t("cm_parties.list_stats", {
            total,
            from: total === 0 ? 0 : (page - 1) * pageSize + 1,
            to: Math.min(page * pageSize, total),
          })}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>

      <CrmModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("cm_parties.create_title")}
      >
        <form className="space-y-3" onSubmit={(e) => void onCreate(e)}>
          <label className="block text-xs font-semibold uppercase tracking-wide text-sage-600">
            {t("cm_parties.field_email")}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={creating}
              className="mt-1 w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm font-normal normal-case text-sage-900"
              placeholder="name@example.com"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-sage-600">
            {t("cm_parties.field_name")}
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={creating}
              className="mt-1 w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm font-normal normal-case text-sage-900"
            />
          </label>
          {createError ? <p className="text-sm font-normal normal-case text-red-700">{createError}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => setCreateOpen(false)} className="crm-btn crm-btn-secondary">
              {t("confirm_dialog.cancel")}
            </button>
            <button
              type="submit"
              disabled={creating || !email.trim()}
              className="crm-btn crm-btn-primary"
            >
              {creating ? t("cm_parties.creating") : t("cm_parties.create_submit")}
            </button>
          </div>
        </form>
      </CrmModal>
    </div>
  );
}
