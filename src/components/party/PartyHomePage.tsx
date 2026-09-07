"use client";

import { Link } from "@/components/ui/AppLink";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CANONICAL_CASE_STAGES,
  canonicalStageIndex,
  isCanonicalCaseStage,
} from "@/constants/case-stages";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";
import type { PartyCaseRow } from "@/lib/party/fetch-party-cases";

type Party = "intended_parent" | "surrogate_mother";

type Props = {
  party: Party;
  apiBase: string;
  casesHref: string;
  detailBase: string;
  /** 代孕母端：资料页 */
  profileHref?: string;
};

function formatDt(iso: string | null, lng: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return lng.toLowerCase().startsWith("zh")
      ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(d)
      : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d);
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

function stageProgress(processStatus: string | null) {
  const curIdx =
    processStatus && isCanonicalCaseStage(processStatus)
      ? canonicalStageIndex(processStatus)
      : -1;
  const total = CANONICAL_CASE_STAGES.length;
  const pct = curIdx >= 0 ? Math.round(((curIdx + 1) / total) * 100) : 0;
  return { curIdx, total, pct };
}

export function PartyHomePage({
  party,
  apiBase,
  casesHref,
  detailBase,
  profileHref,
}: Props) {
  const { t, i18n } = useTranslation("portal");
  const { t: tStage } = useTranslation("caseStage");
  const { t: tCommon } = useTranslation("common");
  const [rows, setRows] = useState<PartyCaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const isIp = party === "intended_parent";

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorKey(null);
      try {
        const res = await fetch(apiBase);
        if (res.status === 401) {
          if (!cancelled) {
            setErrorKey("party_cases.error_unauthorized");
            setRows([]);
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            setErrorKey("party_cases.error_load");
            setRows([]);
          }
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

  const focus = rows[0] ?? null;
  const focusProgress = useMemo(
    () => stageProgress(focus?.process_status ?? null),
    [focus?.process_status],
  );

  const trustTotal = useMemo(() => {
    if (!isIp) return null;
    return rows.reduce((sum, r) => {
      const n = Number(r.trust_account_balance);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [isIp, rows]);

  const rise = (delayMs: number) =>
    ready
      ? {
          opacity: 1,
          transform: "translateY(0)",
          transition: `opacity 0.55s ease-out ${delayMs}ms, transform 0.55s ease-out ${delayMs}ms`,
        }
      : { opacity: 0, transform: "translateY(12px)" };

  const stageLabel = (status: string | null) =>
    translateProcessStatus(status ?? "", tStage) || status || "—";

  return (
    <div className="ami-ui relative mx-auto max-w-3xl space-y-10 text-sage-900">
      {/* 首屏：品牌 + 一句说明 + CTA */}
      <header className="pt-2" style={rise(0)}>
        <p className="crm-font-display text-4xl font-semibold tracking-[0.12em] text-brand-brown md:text-5xl">
          YUNDA
        </p>
        <h1 className="crm-font-display mt-3 text-2xl font-semibold text-sage-900 md:text-3xl">
          {t(isIp ? "party_home.ip_welcome" : "party_home.sm_welcome")}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-sage-700 md:text-base">
          {t(isIp ? "party_home.ip_intro" : "party_home.sm_intro")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={casesHref}
            className="crm-btn crm-btn-primary"
          >
            {t("party_home.cta_cases")}
          </Link>
          {!isIp && profileHref ? (
            <Link
              href={profileHref}
              className="crm-btn crm-btn-secondary"
            >
              {t("party_home.cta_profile")}
            </Link>
          ) : null}
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-sage-600" style={rise(60)}>
          {tCommon("loading")}
        </p>
      ) : null}
      {errorKey ? (
        <p className="text-sm text-red-700" style={rise(60)}>
          {t(errorKey)}
        </p>
      ) : null}

      {!loading && !errorKey && rows.length === 0 ? (
        <section
          className="border-y border-sage-300/70 py-8"
          style={rise(80)}
        >
          <h2 className="crm-font-display text-lg font-semibold text-brand-brown">
            {t("party_home.empty_title")}
          </h2>
          <p className="mt-2 text-sm text-sage-700">{t("party_home.empty_body")}</p>
        </section>
      ) : null}

      {!loading && !errorKey && focus ? (
        <section style={rise(80)}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                {t("party_home.focus_eyebrow")}
              </p>
              <h2 className="crm-font-display mt-1 text-xl font-semibold text-brand-brown">
                {t("party_home.focus_title", { id: focus.id })}
              </h2>
            </div>
            <Link
              href={`${detailBase}/${focus.id}`}
              className="text-sm font-semibold text-brand-brown underline-offset-2 hover:underline"
            >
              {t("party_home.open_case")}
            </Link>
          </div>

          <div className="mb-4">
            <div className="mb-1.5 flex justify-between text-xs font-medium text-sage-600">
              <span>{stageLabel(focus.process_status)}</span>
              <span className="tabular-nums">
                {focusProgress.curIdx >= 0
                  ? `${focusProgress.curIdx + 1} / ${focusProgress.total}`
                  : "—"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sage-200/90">
              <div
                className="h-full rounded-full bg-brand-brown"
                style={{
                  width: ready ? `${focusProgress.pct}%` : "0%",
                  transition: "width 0.9s ease-out 0.2s",
                }}
              />
            </div>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                {isIp ? t("party_cases.col_surrogate") : t("party_cases.col_intended_parent")}
              </dt>
              <dd className="mt-0.5 font-medium text-sage-900">{focus.counterpartName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                {t("party_cases.col_case_manager")}
              </dt>
              <dd className="mt-0.5 text-sage-800">
                {focus.caseManagerEmail ? (
                  <a
                    href={`mailto:${focus.caseManagerEmail}`}
                    className="text-brand-brown hover:underline"
                  >
                    {focus.caseManagerEmail}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                {t("party_cases.col_updated")}
              </dt>
              <dd className="mt-0.5 text-sage-800">
                {formatDt(focus.updated_at, i18n.language)}
              </dd>
            </div>
            {isIp ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                  {t("party_cases.col_trust")}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-sage-900">
                  {formatMoney(focus.trust_account_balance, i18n.language)}
                </dd>
              </div>
            ) : null}
          </dl>

          <p className="mt-4 text-sm text-sage-700">
            {t("party_home.focus_hint")}
          </p>
        </section>
      ) : null}

      {!loading && !errorKey && isIp && rows.length > 0 ? (
        <section className="border-t border-sage-300/70 pt-8" style={rise(140)}>
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">
            {t("party_home.trust_eyebrow")}
          </p>
          <h2 className="crm-font-display mt-1 text-lg font-semibold text-brand-brown">
            {t("party_home.trust_title")}
          </h2>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-sage-900">
            {formatMoney(String(Math.round((trustTotal ?? 0) * 100) / 100), i18n.language)}
          </p>
          <p className="mt-1 text-sm text-sage-600">{t("party_home.trust_hint")}</p>
          {focus ? (
            <Link
              href={`${detailBase}/${focus.id}`}
              className="mt-3 inline-block text-sm font-semibold text-brand-brown underline-offset-2 hover:underline"
            >
              {t("party_home.trust_cta")}
            </Link>
          ) : null}
        </section>
      ) : null}

      {!loading && !errorKey && !isIp && profileHref ? (
        <section className="border-t border-sage-300/70 pt-8" style={rise(140)}>
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">
            {t("party_home.profile_eyebrow")}
          </p>
          <h2 className="crm-font-display mt-1 text-lg font-semibold text-brand-brown">
            {t("party_home.profile_title")}
          </h2>
          <p className="mt-2 text-sm text-sage-700">{t("party_home.profile_body")}</p>
          <Link
            href={profileHref}
            className="mt-4 inline-flex rounded-md border border-sage-400 bg-white px-4 py-2 text-sm font-semibold text-sage-800 transition-colors hover:bg-[#fffcf8]"
          >
            {t("party_home.cta_profile")}
          </Link>
        </section>
      ) : null}

      {!loading && !errorKey && rows.length > 1 ? (
        <section className="border-t border-sage-300/70 pt-8" style={rise(200)}>
          <div className="mb-4 flex items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                {t("party_home.more_eyebrow")}
              </p>
              <h2 className="crm-font-display mt-1 text-lg font-semibold text-brand-brown">
                {t("party_home.more_title", { count: rows.length })}
              </h2>
            </div>
            <Link
              href={casesHref}
              className="text-sm font-semibold text-brand-brown underline-offset-2 hover:underline"
            >
              {t("party_home.cta_cases")}
            </Link>
          </div>
          <ul className="divide-y divide-sage-200/80 border-y border-sage-200/80">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-sage-900">
                    #{row.id}
                    <span className="mx-2 text-sage-400">·</span>
                    <span className="text-sage-700">{row.counterpartName}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-sage-600">
                    {stageLabel(row.process_status)}
                    <span className="mx-1.5">·</span>
                    {formatDt(row.updated_at, i18n.language)}
                  </p>
                </div>
                <Link
                  href={`${detailBase}/${row.id}`}
                  className="crm-btn crm-btn-primary crm-btn-xs shrink-0"
                >
                  {t("party_cases.view_detail")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && !errorKey && rows.length === 1 ? (
        <p className="text-center text-xs text-sage-500" style={rise(200)}>
          {t("party_home.single_case_note")}
        </p>
      ) : null}
    </div>
  );
}
