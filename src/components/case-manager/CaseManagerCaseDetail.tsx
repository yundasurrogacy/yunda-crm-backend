"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AmCaseDetail } from "@/lib/case-manager/fetch-case-detail";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";
import { CaseManagerAmWorkspacePanel } from "@/components/case-manager/CaseManagerAmWorkspacePanel";

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  const [open, setOpen] = useState(false);
  if (value == null) return null;
  const txt = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!txt || txt === "{}" || txt === "[]") return null;
  return (
    <div className="rounded-lg border border-sage-200/80 bg-white/60">
      <button
        type="button"
        className="ami-ui flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-sage-700"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <span className="tabular-nums text-sage-500">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <pre className="crm-font-ui max-h-72 overflow-auto border-t border-sage-100 p-3 text-[11px] leading-relaxed text-sage-800">
          {txt}
        </pre>
      ) : null}
    </div>
  );
}

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

export function CaseManagerCaseDetail({
  caseId,
  apiPathBase = "/api/case-manager/cases",
  backHref = "/case_manager/my-cases",
}: {
  caseId: string;
  apiPathBase?: string;
  backHref?: string;
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
          <CaseManagerAmWorkspacePanel caseId={caseId} detail={data} onDetailUpdated={setData} />

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

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6">
              <h2 className="crm-font-display mb-4 text-lg font-semibold text-brand-brown">{t("case_detail.section_surrogate")}</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">{t("case_detail.field_display_name")}</dt>
                  <dd className="mt-1 text-sage-900">{data.surrogate.displayName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">{t("case_detail.field_email")}</dt>
                  <dd className="mt-1 break-all text-sage-900">{data.surrogate.email || "—"}</dd>
                </div>
              </dl>
              <div className="mt-4 space-y-2">
                <JsonBlock label={t("case_detail.json_contact_information")} value={data.surrogate.contact_information} />
              </div>
            </section>

            <section className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6">
              <h2 className="crm-font-display mb-4 text-lg font-semibold text-brand-brown">{t("case_detail.section_intended_parents")}</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">{t("case_detail.field_display_name")}</dt>
                  <dd className="mt-1 text-sage-900">{data.intended_parent.displayName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">{t("case_detail.field_email")}</dt>
                  <dd className="mt-1 break-all text-sage-900">{data.intended_parent.email || "—"}</dd>
                </div>
              </dl>
              <div className="mt-4 space-y-2">
                <JsonBlock label={t("case_detail.json_basic_information")} value={data.intended_parent.basic_information} />
                <JsonBlock label={t("case_detail.json_family_profile")} value={data.intended_parent.family_profile} />
              </div>
            </section>
          </div>

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
        </>
      ) : null}
    </div>
  );
}
