"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { BindLoginUserModal } from "./BindLoginUserModal";

type Kind = "case_manager" | "intended_parent" | "surrogate_mother";
type Row = { entityId: string; userId: string | null; email: string };

type ModalState = { entityId: string; mode: "bind" | "rebind" };

export function AdminAccountManager({ kind }: { kind: Kind }) {
  const { t } = useTranslation("portal");
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  async function load() {
    setLoading(true);
    try {
      const url = new URL("/api/admin/accounts", window.location.origin);
      url.searchParams.set("kind", kind);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));
      if (q.trim()) url.searchParams.set("q", q.trim());
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
  }, [kind, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6">
        <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t(`admin_accounts.title_${kind}`)}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-sage-700">{t("admin_accounts.intro_bind_entity")}</p>
        <div className="mt-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin_accounts.search_placeholder")}
            className="w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
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
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-sage-200/80 bg-white">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-sage-200 bg-sage-100 text-xs font-semibold uppercase tracking-wide text-sage-700">
                <th className="px-4 py-3">{t("admin_accounts.col_entity_id")}</th>
                <th className="px-4 py-3">{t("admin_accounts.col_user_id")}</th>
                <th className="px-4 py-3">{t("admin_accounts.col_email")}</th>
                <th className="px-4 py-3">{t("admin_accounts.col_bind_login")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sage-600" colSpan={4}>
                    {t("admin_accounts.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sage-600" colSpan={4}>
                    {t("admin_accounts.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.entityId} className="border-b border-sage-100">
                    <td className="px-4 py-3">{r.entityId}</td>
                    <td className="px-4 py-3">{r.userId ?? "—"}</td>
                    <td className="px-4 py-3">{r.email || "—"}</td>
                    <td className="px-4 py-3">
                      {r.userId ? (
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
