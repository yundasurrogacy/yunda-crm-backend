"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PartyCaseRow } from "@/lib/party/fetch-party-cases";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";
import { rememberListReturn, restoreMainScroll } from "@/lib/crm-list-return";
import { hrefWithReturnTo, useSyncedListQuery } from "@/lib/use-synced-list-query";
import { ListPager } from "@/components/ui/ListPager";

function formatDt(iso: string | null, lng: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return lng.toLowerCase().startsWith("zh")
      ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(d)
      : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
  } catch {
    return iso;
  }
}

function formatMoney(raw: string, lng: string) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return `$${raw}`;
  return new Intl.NumberFormat(lng.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function PartyMyCasesPage({
  party,
  apiBase,
  detailBase,
}: {
  party: "intended_parent" | "surrogate_mother";
  apiBase: string;
  detailBase: string;
}) {
  const { t } = useTranslation("portal");
  const { t: tCommon } = useTranslation("common");
  const { t: tStage } = useTranslation("caseStage");
  const { i18n } = useTranslation();
  const { page, pageSize, href, replaceQuery } = useSyncedListQuery();
  const [rows, setRows] = useState<PartyCaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const didRestoreScroll = useRef(false);

  const showTrust = party === "intended_parent";
  const counterpartLabel =
    party === "intended_parent" ? t("party_cases.col_surrogate") : t("party_cases.col_intended_parent");

  const trustTotal = useMemo(() => {
    if (!showTrust) return null;
    return rows.reduce((sum, r) => {
      const n = Number(r.trust_account_balance);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [rows, showTrust]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorKey(null);
      try {
        const res = await fetch(apiBase);
        if (res.status === 401) {
          setErrorKey("party_cases.error_unauthorized");
          setRows([]);
          return;
        }
        if (!res.ok) {
          setErrorKey("party_cases.error_load");
          setRows([]);
          return;
        }
        const json = (await res.json()) as { rows?: PartyCaseRow[] };
        if (!cancelled) setRows(json.rows ?? []);
      } catch {
        if (!cancelled) {
          setErrorKey("party_cases.error_load");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const colSpan = showTrust ? 7 : 6;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (didRestoreScroll.current || loading) return;
    didRestoreScroll.current = true;
    restoreMainScroll(href);
  }, [href, loading]);

  return (
    <div className="ami-ui crm-font-ui crm-fill-page">
      <div>
        <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t("party_cases.page_title")}</h1>
        <p className="mt-1 text-sm text-sage-700">{t("party_cases.page_intro")}</p>
      </div>

      {showTrust && !loading && !errorKey && rows.length > 0 ? (
        <div className="crm-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">
            {t("party_cases.trust_total_label")}
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-sage-900">
            {formatMoney(String(Math.round((trustTotal ?? 0) * 100) / 100), i18n.language)}
          </p>
          <p className="mt-0.5 text-xs text-sage-600">{t("party_cases.trust_total_hint")}</p>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-sage-600">{tCommon("loading")}</p> : null}
      {errorKey ? <p className="text-sm text-red-700">{t(errorKey)}</p> : null}

      {!loading && !errorKey ? (
        <div className="crm-card crm-card-list">
          <div className="crm-table-scroll">
          <table className="crm-table min-w-[32rem]">
            <thead>
              <tr>
                <th className="crm-freeze-id crm-freeze-id-first">{t("party_cases.col_case_id")}</th>
                <th>{counterpartLabel}</th>
                <th>{t("party_cases.col_stage")}</th>
                {showTrust ? <th>{t("party_cases.col_trust")}</th> : null}
                <th>{t("party_cases.col_case_manager")}</th>
                <th>{t("party_cases.col_updated")}</th>
                <th className="crm-freeze-end">{t("party_cases.col_action")}</th>
              </tr>
            </thead>
            <tbody className="text-sage-900">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-sage-600">
                    {t("party_cases.empty")}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className="border-b border-sage-100 hover:bg-sage-50/80">
                    <td className="crm-freeze-id crm-freeze-id-first tabular-nums font-medium">{row.id}</td>
                    <td className="px-4 py-3">{row.counterpartName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-800">
                        {translateProcessStatus(row.process_status ?? "", tStage) || row.process_status || "—"}
                      </span>
                    </td>
                    {showTrust ? (
                      <td className="px-4 py-3 tabular-nums font-medium text-sage-900">
                        {formatMoney(row.trust_account_balance, i18n.language)}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-sage-700">{row.caseManagerEmail || "—"}</td>
                    <td className="px-4 py-3 text-xs text-sage-700">
                      {formatDt(row.updated_at, i18n.language)}
                    </td>
                    <td className="crm-freeze-end">
                      <Link
                        href={hrefWithReturnTo(`${detailBase}/${row.id}`, href)}
                        onClick={() => rememberListReturn(href)}
                        className="crm-btn crm-btn-secondary crm-btn-xs"
                      >
                        {t("party_cases.view_detail")}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          <ListPager
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            stats={t("party_cases.list_stats", {
              total: rows.length,
              from: rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
              to: Math.min(safePage * pageSize, rows.length),
            })}
            onPageChange={(next) => replaceQuery({ page: next })}
            onPageSizeChange={(size) => {
              replaceQuery({ page: 1, pageSize: size });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
