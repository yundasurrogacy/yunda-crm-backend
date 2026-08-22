"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EntityKind } from "@/lib/admin/entity-profile";
import type { PartyListRow } from "@/lib/party/list-cm-parties";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export function CaseManagerPartyListPage({ kind }: { kind: EntityKind }) {
  const { t } = useTranslation("portal");
  const confirm = useConfirm();
  const [rows, setRows] = useState<PartyListRow[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, [kind, includeDeleted, page]); // eslint-disable-line react-hooks/exhaustive-deps -- search via button

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
    try {
      const res = await fetch("/api/case-manager/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, email, displayName }),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setError(
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
      setMessage(t("cm_parties.created", { id: json.id ?? "" }));
      setPage(1);
      await load(1);
    } catch {
      setError(t("cm_parties.error_create"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="ami-ui crm-font-ui crm-page">
      <div>
        <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">
          {t(`cm_parties.title_${kind}`)}
        </h1>
        <p className="mt-1 text-sm text-sage-700">{t("cm_parties.intro")}</p>
      </div>

      <section className="crm-card">
        <h2 className="crm-font-display mb-3 text-lg font-semibold text-brand-brown">
          {t("cm_parties.create_title")}
        </h2>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => void onCreate(e)}>
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
          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating || !email.trim()}
              className="rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {creating ? t("cm_parties.creating") : t("cm_parties.create_submit")}
            </button>
          </div>
        </form>
      </section>

      <section className="crm-card">
        <div className="mb-3 flex flex-wrap items-center gap-2">
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
            className="rounded-md bg-sage-700 px-3 py-2 text-sm font-semibold text-white"
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

        {error ? <p className="mb-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mb-2 text-sm text-emerald-800">{message}</p> : null}

        <div className="overflow-x-auto rounded-lg border border-sage-200/80 bg-white">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-sage-200 bg-sage-100 text-xs font-semibold uppercase tracking-wide text-sage-700">
                <th className="px-4 py-3">{t("cm_parties.col_id")}</th>
                <th className="px-4 py-3">{t("cm_parties.col_name")}</th>
                <th className="px-4 py-3">{t("cm_parties.col_email")}</th>
                <th className="px-4 py-3">{t("cm_parties.col_source")}</th>
                <th className="px-4 py-3">{t("cm_parties.col_status")}</th>
                <th className="px-4 py-3">{t("cm_parties.col_action")}</th>
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
                      <td className="px-4 py-3 tabular-nums">{r.entityId}</td>
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
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {!isDeleted ? (
                            <Link
                              href={`${detailBase}/${r.entityId}`}
                              className="rounded-md border border-sage-500 bg-sage-50 px-3 py-1.5 text-xs font-semibold text-sage-900 hover:bg-sage-100"
                            >
                              {t("cm_parties.view_profile")}
                            </Link>
                          ) : null}
                          {isDeleted ? (
                            <button
                              type="button"
                              disabled={busyId === r.entityId}
                              onClick={() => void onSoftDelete(r, false)}
                              className="rounded-md border border-emerald-700 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
                            >
                              {t("cm_parties.btn_restore")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === r.entityId}
                              onClick={() => void onSoftDelete(r, true)}
                              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-sage-700">
          <p className="min-w-0">
            {t("cm_parties.list_stats", {
              total,
              from: total === 0 ? 0 : (page - 1) * pageSize + 1,
              to: Math.min(page * pageSize, total),
            })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-sage-300 bg-white px-2 py-1 disabled:opacity-40"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              {t("cm_parties.prev")}
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              className="rounded border border-sage-300 bg-white px-2 py-1 disabled:opacity-40"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("cm_parties.next")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
