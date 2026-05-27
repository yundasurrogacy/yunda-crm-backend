"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CaseEntityProfileCard } from "@/components/case-manager/CaseEntityProfileCard";
import type { AmCaseDetail } from "@/lib/case-manager/fetch-case-detail";
import { GC_PROFILE_SECTIONS } from "@/constants/gc-profile-schema";
import { IP_PROFILE_SECTIONS } from "@/constants/ip-profile-schema";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";

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

export function PartyCaseDetailPage({
  caseId,
  apiBase,
  listHref,
}: {
  caseId: string;
  apiBase: string;
  listHref: string;
}) {
  const { t } = useTranslation("portal");
  const { t: tCommon } = useTranslation("common");
  const { t: tStage } = useTranslation("caseStage");
  const { i18n } = useTranslation();
  const [data, setData] = useState<AmCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorKey(null);
      try {
        const res = await fetch(`${apiBase}/${encodeURIComponent(caseId)}`);
        if (res.status === 401) {
          setErrorKey("party_cases.error_unauthorized");
          return;
        }
        if (res.status === 404) {
          setErrorKey("party_cases.error_not_found");
          return;
        }
        if (!res.ok) {
          setErrorKey("party_cases.error_load");
          return;
        }
        const json = (await res.json()) as AmCaseDetail;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setErrorKey("party_cases.error_load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase, caseId]);

  const lng = i18n.language;

  return (
    <div className="ami-ui crm-font-ui space-y-6 text-sage-900">
      <div className="flex flex-wrap items-start gap-4">
        <Link
          href={listHref}
          className="ami-ui inline-flex items-center gap-1.5 rounded-md border border-sage-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-sage-800 shadow-sm hover:bg-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
          {t("party_cases.back_list")}
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">
            {t("party_cases.detail_title")}
          </h1>
          <p className="mt-1 text-sm text-sage-700">{t("party_cases.detail_intro")}</p>
        </div>
      </div>

      {loading ? <p className="text-sm text-sage-600">{tCommon("loading")}</p> : null}
      {errorKey ? <p className="text-sm text-red-700">{t(errorKey)}</p> : null}

      {!loading && data ? (
        <>
          <section className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6">
            <h2 className="crm-font-display mb-4 text-lg font-semibold text-brand-brown">
              {t("party_cases.section_summary")}
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                  {t("party_cases.col_case_id")}
                </dt>
                <dd className="mt-1 font-medium">{data.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                  {t("party_cases.col_stage")}
                </dt>
                <dd className="mt-1">
                  <span className="inline-block rounded-md bg-sage-100 px-2.5 py-1 text-xs font-medium text-sage-800">
                    {translateProcessStatus(data.process_status ?? "", tStage) || data.process_status || "—"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                  {t("party_cases.col_case_manager")}
                </dt>
                <dd className="mt-1">{data.case_manager?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                  {t("case_detail.field_created")}
                </dt>
                <dd className="mt-1">{formatDt(data.created_at, lng)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                  {t("case_detail.field_updated")}
                </dt>
                <dd className="mt-1">{formatDt(data.updated_at, lng)}</dd>
              </div>
            </dl>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <CaseEntityProfileCard
              title={t("case_detail.section_surrogate")}
              subtitle={data.surrogate.displayName || data.surrogate.email || null}
              profileTitle={t("case_detail.section_gc_profile")}
              sections={GC_PROFILE_SECTIONS}
              profileData={data.surrogate.profile_data}
              lng={lng}
              emptyMessage={t("case_detail.profile_empty_gc")}
            />
            <CaseEntityProfileCard
              title={t("case_detail.section_intended_parents")}
              subtitle={data.intended_parent.displayName || data.intended_parent.email || null}
              profileTitle={t("case_detail.section_ip_profile")}
              sections={IP_PROFILE_SECTIONS}
              profileData={data.intended_parent.profile_data}
              lng={lng}
              emptyMessage={t("case_detail.profile_empty_ip")}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
