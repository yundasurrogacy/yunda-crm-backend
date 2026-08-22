"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AmCaseDetail } from "@/lib/case-manager/fetch-case-detail";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";
import { AdminCaseManagersPanel } from "@/components/admin/AdminCaseManagersPanel";
import { BindSurrogateToCase } from "@/components/case-manager/BindSurrogateToCase";
import { CaseEntityProfileCard } from "@/components/case-manager/CaseEntityProfileCard";
import { CaseManagerAmWorkspacePanel } from "@/components/case-manager/CaseManagerAmWorkspacePanel";
import { CaseFilesPanel } from "@/components/case-manager/CaseFilesPanel";
import { CaseP1OpsPanel } from "@/components/case-manager/CaseP1OpsPanel";
import { CaseTrustLedgerPanel } from "@/components/case-manager/CaseTrustLedgerPanel";
import { GC_PROFILE_SECTIONS } from "@/constants/gc-profile-schema";
import { IP_PROFILE_SECTIONS } from "@/constants/ip-profile-schema";

function formatDt(iso: string, lng: string) {
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

function partyManageHref(
  mode: "case_manager" | "admin",
  kind: "intended_parent" | "surrogate_mother",
  entityId: string | null,
  caseId: string,
): string | null {
  if (!entityId) return null;
  const returnTo = encodeURIComponent(
    mode === "admin" ? `/admin/cases/${caseId}` : `/case_manager/cases/${caseId}`,
  );
  if (mode === "admin") {
    const segment = kind === "intended_parent" ? "intended-parents" : "surrogates";
    return `/admin/accounts/${segment}/${entityId}?returnTo=${returnTo}`;
  }
  const segment = kind === "intended_parent" ? "intended-parents" : "surrogates";
  return `/case_manager/parties/${segment}/${entityId}?returnTo=${returnTo}`;
}

export function CaseManagerCaseDetail({
  caseId,
  apiPathBase = "/api/case-manager/cases",
  backHref = "/case_manager/my-cases",
  casesPageBase = "/case_manager/cases",
  partyProfileMode = "case_manager",
}: {
  caseId: string;
  apiPathBase?: string;
  backHref?: string;
  /** 阶段切换 URL 前缀（含 `/cases` 段） */
  casesPageBase?: string;
  /** 档案编辑页：案例经理仅可改其负责案例的 GC/IP；管理端走 admin 账号页 */
  partyProfileMode?: "case_manager" | "admin";
}) {
  const { t } = useTranslation("portal");
  const { t: tCommon } = useTranslation("common");
  const { t: tStage } = useTranslation("caseStage");
  const { i18n } = useTranslation();
  const [data, setData] = useState<AmCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [gcOpsTick, setGcOpsTick] = useState(0);

  const reloadDetail = useCallback(async () => {
    try {
      const res = await fetch(`${apiPathBase}/${encodeURIComponent(caseId)}`);
      if (!res.ok) return;
      const json = (await res.json()) as AmCaseDetail;
      setData(json);
    } catch {
      /* keep current */
    }
  }, [apiPathBase, caseId]);

  const onGcBound = useCallback(() => {
    setGcOpsTick((n) => n + 1);
    void reloadDetail();
  }, [reloadDetail]);

  const onTrustBalanceUpdated = useCallback((balance: string) => {
    setData((prev) => {
      if (!prev || prev.trust_account_balance === balance) return prev;
      return { ...prev, trust_account_balance: balance };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorKey(null);
      try {
        const res = await fetch(`${apiPathBase}/${encodeURIComponent(caseId)}`);
        if (res.status === 401) {
          setErrorKey("case_detail.error_unauthorized");
          setData(null);
          return;
        }
        if (res.status === 404) {
          setErrorKey("case_detail.error_not_found");
          setData(null);
          return;
        }
        if (!res.ok) {
          setErrorKey("case_detail.error_load");
          setData(null);
          return;
        }
        const json = (await res.json()) as AmCaseDetail;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) {
          setErrorKey("case_detail.error_load");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, apiPathBase]);

  const lng = i18n.language;

  return (
    <div className="ami-ui crm-font-ui space-y-6 text-sage-900">
      <div className="flex flex-wrap items-start gap-4">
        <Link
          href={backHref}
          className="ami-ui inline-flex items-center gap-1.5 rounded-md border border-sage-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-sage-800 shadow-sm hover:bg-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
          {t("case_detail.back_my_cases")}
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t("case_detail.page_title")}</h1>
          <p className="mt-1 text-sm text-sage-700">{t("case_detail.subtitle")}</p>
        </div>
      </div>

      {loading ? <p className="text-sm text-sage-600">{tCommon("loading")}</p> : null}
      {errorKey ? <p className="text-sm text-red-700">{t(errorKey)}</p> : null}

      {!loading && data ? (
        <>
          {partyProfileMode === "admin" ? (
            <AdminCaseManagersPanel caseId={caseId} />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6">
              {data.surrogate.id ? (
                <CaseEntityProfileCard
                  embedded
                  title={t("case_detail.section_surrogate")}
                  subtitle={data.surrogate.displayName || data.surrogate.email || null}
                  profileTitle={t("case_detail.section_gc_profile")}
                  sections={GC_PROFILE_SECTIONS}
                  profileData={data.surrogate.profile_data}
                  lng={lng}
                  emptyMessage={t("case_detail.profile_empty_gc")}
                  manageHref={partyManageHref(partyProfileMode, "surrogate_mother", data.surrogate.id, caseId)}
                  manageLabel={t("case_detail.manage_profile")}
                  showPhotos
                />
              ) : (
                <>
                  <h2 className="crm-font-display text-lg font-semibold text-brand-brown">
                    {t("case_detail.section_surrogate")}
                  </h2>
                  <p className="mt-1 text-sm text-sage-700">{t("case_detail.no_gc_bound")}</p>
                  <BindSurrogateToCase
                    caseId={caseId}
                    apiCasesBase={apiPathBase}
                    onBound={onGcBound}
                  />
                </>
              )}
              {data.surrogate.id ? (
                <BindSurrogateToCase
                  caseId={caseId}
                  apiCasesBase={apiPathBase}
                  mode="replace"
                  excludeSurrogateId={data.surrogate.id}
                  onBound={onGcBound}
                />
              ) : null}
            </div>
            <CaseEntityProfileCard
              title={t("case_detail.section_intended_parents")}
              subtitle={data.intended_parent.displayName || data.intended_parent.email || null}
              profileTitle={t("case_detail.section_ip_profile")}
              sections={IP_PROFILE_SECTIONS}
              profileData={data.intended_parent.profile_data}
              lng={lng}
              emptyMessage={t("case_detail.profile_empty_ip")}
              manageHref={partyManageHref(partyProfileMode, "intended_parent", data.intended_parent.id, caseId)}
              manageLabel={t("case_detail.manage_profile")}
            />
          </div>

          <CaseManagerAmWorkspacePanel
            caseId={caseId}
            detail={data}
            onDetailUpdated={setData}
            apiPathBase={apiPathBase}
            casesPageBase={casesPageBase}
          />

          <CaseTrustLedgerPanel
            caseId={caseId}
            apiPathBase={apiPathBase}
            currentBalance={data.trust_account_balance}
            onBalanceUpdated={onTrustBalanceUpdated}
          />

          <CaseFilesPanel caseId={caseId} apiPathBase={apiPathBase} />

          <CaseP1OpsPanel
            caseId={caseId}
            apiPathBase={apiPathBase}
            detail={data}
            onDetailUpdated={setData}
            refreshTick={gcOpsTick}
          />

          <section className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm backdrop-blur-[1px] md:p-6">
            <h2 className="crm-font-display mb-4 text-lg font-semibold text-brand-brown">{t("case_detail.section_summary")}</h2>
            <dl className="crm-font-ui grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">{t("case_detail.field_case_id")}</dt>
                <dd className="mt-1 text-sm font-medium text-sage-900">{data.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">{t("case_detail.field_stage")}</dt>
                <dd className="mt-1">
                  <span className="inline-block rounded-md bg-sage-100 px-2.5 py-1 text-xs font-medium text-sage-800">
                    {translateProcessStatus(data.process_status ?? "", tStage) || data.process_status || "—"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">{t("case_detail.field_trust_balance")}</dt>
                <dd className="mt-1 text-sm font-medium tabular-nums text-sage-900">${data.trust_account_balance}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">{t("case_detail.field_created")}</dt>
                <dd className="mt-1 text-sm text-sage-800">{formatDt(data.created_at, lng)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">{t("case_detail.field_updated")}</dt>
                <dd className="mt-1 text-sm text-sage-800">{formatDt(data.updated_at, lng)}</dd>
              </div>
            </dl>
          </section>

          {partyProfileMode !== "admin" ? (
            <section className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6">
              <h2 className="crm-font-display mb-4 text-lg font-semibold text-brand-brown">{t("case_detail.section_team")}</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">{t("case_detail.field_case_manager")}</dt>
                  <dd className="mt-1 text-sm">
                    {data.case_manager?.email ?? "—"}
                    {data.case_manager?.user_id ? (
                      <span className="ml-2 rounded bg-sage-100 px-1.5 py-0.5 text-[11px] text-sage-700">#{data.case_manager.user_id}</span>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
