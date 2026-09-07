"use client";

import { Link } from "@/components/ui/AppLink";
import { useTranslation } from "react-i18next";
import type { AdminCmWorkloadPayload } from "@/lib/admin/case-manager-caseload";

type Props = {
  data: AdminCmWorkloadPayload | null;
  loading?: boolean;
  error?: boolean;
};

export function AdminCaseManagerWorkload({ data, loading = false, error = false }: Props) {
  const { t } = useTranslation("portal");
  const rows = data?.rows ?? [];
  const assignedTotal = data?.assignedTotal ?? 0;
  const unassignedCount = data?.unassignedCount ?? 0;
  const activeTotal = data?.activeTotal ?? 0;

  return (
    <section className="crm-card">
      <div className="mb-4">
        <h2 className="crm-font-display text-lg font-semibold text-brand-brown">
          {t("admin_cm_workload.title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-sage-700">{t("admin_cm_workload.intro")}</p>
        <Link
          href="/admin/accounts/case-managers"
          className="crm-btn crm-btn-secondary crm-btn-sm mt-2"
        >
          {t("admin_cm_workload.manage_link")}
        </Link>
      </div>

      {loading ? <p className="text-sm text-sage-600">{t("admin_cm_workload.loading")}</p> : null}
      {error ? <p className="text-sm text-red-700">{t("admin_cm_workload.error")}</p> : null}

      {!loading && !error && data ? (
        <>
          <p className="mb-3 text-sm leading-relaxed text-sage-800">
            {t("admin_cm_workload.summary", {
              assigned: assignedTotal,
              unassigned: unassignedCount,
              total: activeTotal,
            })}
          </p>
          <div className="overflow-x-auto rounded-lg border border-sage-200/80 bg-white">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-sage-200 bg-sage-100 text-xs font-semibold uppercase tracking-wide text-sage-700">
                  <th className="px-4 py-3">{t("admin_cm_workload.col_id")}</th>
                  <th className="px-4 py-3">{t("admin_cm_workload.col_email")}</th>
                  <th className="px-4 py-3 text-right">{t("admin_cm_workload.col_cases")}</th>
                  <th className="px-4 py-3">{t("admin_cm_workload.col_action")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-sage-600">
                      {t("admin_cm_workload.empty")}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.entityId} className="border-b border-sage-100">
                      <td className="px-4 py-3 tabular-nums">{r.entityId}</td>
                      <td className="px-4 py-3 break-all">{r.email || "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-sage-900">
                        {r.caseCount}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/cases?stage=all&caseManagerId=${encodeURIComponent(r.entityId)}`}
                          className="crm-btn crm-btn-secondary crm-btn-xs"
                        >
                          {t("admin_cm_workload.view_cases")}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
                {unassignedCount > 0 ? (
                  <tr className="border-b border-amber-100 bg-amber-50/60">
                    <td className="px-4 py-3 text-amber-900">—</td>
                    <td className="px-4 py-3 font-medium text-amber-900">
                      {t("admin_cm_workload.unassigned_label")}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-900">
                      {unassignedCount}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href="/admin/cases?stage=all&caseManagerId=unassigned"
                        className="crm-btn crm-btn-secondary crm-btn-xs"
                      >
                        {t("admin_cm_workload.view_cases")}
                      </Link>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
