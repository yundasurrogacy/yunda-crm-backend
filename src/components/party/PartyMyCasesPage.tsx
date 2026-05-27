"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PartyCaseRow } from "@/lib/party/fetch-party-cases";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";

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
  const [rows, setRows] = useState<PartyCaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const counterpartLabel =
    party === "intended_parent" ? t("party_cases.col_surrogate") : t("party_cases.col_intended_parent");

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

  return (
    <div className="ami-ui crm-font-ui space-y-6 text-sage-900">
      <div>
        <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t("party_cases.page_title")}</h1>
        <p className="mt-1 text-sm text-sage-700">{t("party_cases.page_intro")}</p>
      </div>

      {loading ? <p className="text-sm text-sage-600">{tCommon("loading")}</p> : null}
      {errorKey ? <p className="text-sm text-red-700">{t(errorKey)}</p> : null}

      {!loading && !errorKey ? (
        <div className="overflow-hidden rounded-xl border border-sage-200/80 bg-white/50 shadow-sm">
          <table className="crm-font-ui w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-sage-200/80 bg-sage-50/80 text-xs font-semibold uppercase tracking-wide text-sage-600">
              <tr>
                <th className="px-4 py-3">{t("party_cases.col_case_id")}</th>
                <th className="px-4 py-3">{counterpartLabel}</th>
                <th className="px-4 py-3">{t("party_cases.col_stage")}</th>
                <th className="px-4 py-3">{t("party_cases.col_case_manager")}</th>
                <th className="px-4 py-3">{t("party_cases.col_updated")}</th>
                <th className="px-4 py-3">{t("party_cases.col_action")}</th>
              </tr>
            </thead>
            <tbody className="text-sage-900">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sage-600">
                    {t("party_cases.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-sage-100 hover:bg-sage-50/80">
                    <td className="px-4 py-3 tabular-nums font-medium">{row.id}</td>
                    <td className="px-4 py-3">{row.counterpartName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-800">
                        {translateProcessStatus(row.process_status ?? "", tStage) || row.process_status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sage-700">{row.caseManagerEmail || "—"}</td>
                    <td className="px-4 py-3 text-xs text-sage-700">
                      {formatDt(row.updated_at, i18n.language)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`${detailBase}/${row.id}`}
                        className="inline-flex rounded-md bg-sage-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sage-800"
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
      ) : null}
    </div>
  );
}
