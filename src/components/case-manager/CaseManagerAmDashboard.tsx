"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AM_STAGE_ICON_COMPONENTS } from "@/constants/am-stage-icons";
import { CANONICAL_CASE_STAGES, isCanonicalCaseStage, type CanonicalCaseStage } from "@/constants/case-stages";
import type { AmCaseRow } from "@/lib/case-manager/fetch-dashboard-data";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";

type SelectOption = { id: string; label: string };

const CARD_ACCENT = [
  "border border-sage-200/90 bg-[var(--card-background)] text-brand-brown shadow-sm hover:border-brand-brown/30 hover:shadow",
  "border border-sage-300/75 bg-white/85 text-brand-brown shadow-sm hover:border-brand-brown/30 hover:shadow",
] as const;

type DashboardPayload = {
  stage: string;
  counts: Record<string, number> | null;
  rows: AmCaseRow[];
  total: number;
  page: number;
  pageSize: number;
};

function readStageFromSearch(sp: URLSearchParams | null): CanonicalCaseStage {
  const raw = sp?.get("stage");
  if (raw && isCanonicalCaseStage(raw)) return raw;
  return CANONICAL_CASE_STAGES[0];
}

function readTextParam(sp: URLSearchParams | null, key: string): string {
  return sp?.get(key)?.trim() ?? "";
}

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

export function CaseManagerAmDashboard({
  variant = "full",
  apiPath = "/api/case-manager/dashboard",
  detailHrefBase = "/case_manager/cases",
  headingMode = "case_manager",
  headerExtra,
}: {
  /**
   * full：阶段卡片 + 按阶段表格（工作台）
   * stageList：仅阶段筛选表格（`/case_manager/cases?stage=` 承接跳转，侧边栏不提供入口）
   * myCases：不按阶段限制的「我的案例」全表
   */
  variant?: "full" | "stageList" | "myCases";
  apiPath?: string;
  detailHrefBase?: string;
  headingMode?: "case_manager" | "admin";
  /** 标题行右侧附加内容（如管理端案例列表上的「创建案例」） */
  headerExtra?: ReactNode;
}) {
  const { t, i18n } = useTranslation("portal");
  const { t: tCommon } = useTranslation("common");
  const { t: tStage } = useTranslation("caseStage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isMyCases = variant === "myCases";

  const [stage, setStage] = useState<CanonicalCaseStage>(() =>
    readStageFromSearch(searchParams),
  );
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1));
  const [q, setQ] = useState(() => readTextParam(searchParams, "q"));
  const [processStatus, setProcessStatus] = useState(() => readTextParam(searchParams, "processStatus"));
  const [caseManagerId, setCaseManagerId] = useState(() => readTextParam(searchParams, "caseManagerId"));
  const [intendedParentId, setIntendedParentId] = useState(() =>
    readTextParam(searchParams, "intendedParentId"),
  );
  const [surrogateId, setSurrogateId] = useState(() => readTextParam(searchParams, "surrogateId"));
  const [qInput, setQInput] = useState(() => readTextParam(searchParams, "q"));
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [caseManagerOptions, setCaseManagerOptions] = useState<SelectOption[]>([]);
  const [intendedParentOptions, setIntendedParentOptions] = useState<SelectOption[]>([]);
  const [surrogateOptions, setSurrogateOptions] = useState<SelectOption[]>([]);

  const syncUrl = useCallback(
    (
      nextStage: CanonicalCaseStage,
      nextPage: number,
      nextQ: string,
      nextProcessStatus: string,
      nextCm: string,
      nextIp: string,
      nextSm: string,
    ) => {
      const q = new URLSearchParams(searchParams?.toString() ?? "");
      q.set("stage", nextStage);
      q.set("page", String(nextPage));
      if (nextQ.trim()) q.set("q", nextQ.trim());
      else q.delete("q");
      if (nextProcessStatus.trim()) q.set("processStatus", nextProcessStatus.trim());
      else q.delete("processStatus");
      if (nextCm.trim()) q.set("caseManagerId", nextCm.trim());
      else q.delete("caseManagerId");
      if (nextIp.trim()) q.set("intendedParentId", nextIp.trim());
      else q.delete("intendedParentId");
      if (nextSm.trim()) q.set("surrogateId", nextSm.trim());
      else q.delete("surrogateId");
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const syncMyCasesUrl = useCallback(
    (
      nextPage: number,
      nextQ: string,
      nextProcessStatus: string,
      nextCm: string,
      nextIp: string,
      nextSm: string,
    ) => {
      const q = new URLSearchParams(searchParams?.toString() ?? "");
      q.set("page", String(nextPage));
      if (nextQ.trim()) q.set("q", nextQ.trim());
      else q.delete("q");
      if (nextProcessStatus.trim()) q.set("processStatus", nextProcessStatus.trim());
      else q.delete("processStatus");
      if (nextCm.trim()) q.set("caseManagerId", nextCm.trim());
      else q.delete("caseManagerId");
      if (nextIp.trim()) q.set("intendedParentId", nextIp.trim());
      else q.delete("intendedParentId");
      if (nextSm.trim()) q.set("surrogateId", nextSm.trim());
      else q.delete("surrogateId");
      q.delete("stage");
      router.replace(`${pathname}?${q}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const p = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    setPage(p);
    const nextQ = readTextParam(searchParams, "q");
    const nextProcessStatus = readTextParam(searchParams, "processStatus");
    const nextCm = readTextParam(searchParams, "caseManagerId");
    const nextIp = readTextParam(searchParams, "intendedParentId");
    const nextSm = readTextParam(searchParams, "surrogateId");
    setQ(nextQ);
    setQInput(nextQ);
    setProcessStatus(nextProcessStatus);
    setCaseManagerId(nextCm);
    setIntendedParentId(nextIp);
    setSurrogateId(nextSm);
    if (!isMyCases) setStage(readStageFromSearch(searchParams));
  }, [searchParams, isMyCases]);

  /** 工作台 / 案例列表由上方阶段卡片决定 pipeline stage，忽略 URL 里遗留的 processStatus，避免与卡片不一致 */
  useEffect(() => {
    if (isMyCases) return;
    const ps = searchParams.get("processStatus")?.trim();
    if (!ps) return;
    const q = new URLSearchParams(searchParams.toString());
    q.delete("processStatus");
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }, [isMyCases, pathname, router, searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (headingMode === "admin") {
          const url = new URL(apiPath, window.location.origin);
          url.searchParams.set("options", "1");
          const res = await fetch(url.pathname + url.search);
          if (!res.ok) return;
          const json = (await res.json()) as {
            caseManagers: SelectOption[];
            intendedParents: SelectOption[];
            surrogates: SelectOption[];
          };
          if (cancelled) return;
          setCaseManagerOptions(json.caseManagers ?? []);
          setIntendedParentOptions(json.intendedParents ?? []);
          setSurrogateOptions(json.surrogates ?? []);
        } else {
          const res = await fetch("/api/case-manager/case-options");
          if (!res.ok) return;
          const json = (await res.json()) as {
            caseManagers: SelectOption[];
            intendedParents: SelectOption[];
            surrogates: SelectOption[];
          };
          if (cancelled) return;
          setCaseManagerOptions(json.caseManagers ?? []);
          setIntendedParentOptions(json.intendedParents ?? []);
          setSurrogateOptions(json.surrogates ?? []);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiPath, headingMode]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      const stageParam = isMyCases ? "all" : stage;
      const countsParam = variant === "full" ? "" : "&counts=0";
      const url = new URL(apiPath, window.location.origin);
      url.searchParams.set("stage", stageParam);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", "10");
      if (countsParam) url.searchParams.set("counts", "0");
      if (q.trim()) url.searchParams.set("q", q.trim());
      if (isMyCases && processStatus.trim()) url.searchParams.set("processStatus", processStatus.trim());
      if (caseManagerId.trim()) url.searchParams.set("caseManagerId", caseManagerId.trim());
      if (intendedParentId.trim()) url.searchParams.set("intendedParentId", intendedParentId.trim());
      if (surrogateId.trim()) url.searchParams.set("surrogateId", surrogateId.trim());
      const res = await fetch(url.pathname + url.search);
      if (res.status === 401) {
        setErrorKey("am_dash.error_unauthorized");
        setData(null);
        return;
      }
      if (!res.ok) {
        setErrorKey("am_dash.error_data");
        setData(null);
        return;
      }
      const json = (await res.json()) as DashboardPayload;
      setData(json);
    } catch {
      setErrorKey("am_dash.error_data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [
    stage,
    page,
    variant,
    isMyCases,
    q,
    processStatus,
    caseManagerId,
    intendedParentId,
    surrogateId,
    apiPath,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  function onSelectStage(s: CanonicalCaseStage) {
    setStage(s);
    setProcessStatus("");
    setPage(1);
    syncUrl(s, 1, q, "", caseManagerId, intendedParentId, surrogateId);
  }

  function onPageChange(next: number) {
    const p = Math.min(Math.max(1, next), totalPages);
    setPage(p);
    if (isMyCases) syncMyCasesUrl(p, q, processStatus, caseManagerId, intendedParentId, surrogateId);
    else syncUrl(stage, p, q, "", caseManagerId, intendedParentId, surrogateId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onApplyFilters() {
    setPage(1);
    setQ(qInput.trim());
    if (isMyCases)
      syncMyCasesUrl(1, qInput.trim(), processStatus, caseManagerId, intendedParentId, surrogateId);
    else {
      setProcessStatus("");
      syncUrl(stage, 1, qInput.trim(), "", caseManagerId, intendedParentId, surrogateId);
    }
  }

  function onResetFilters() {
    setPage(1);
    setQ("");
    setQInput("");
    setProcessStatus("");
    setCaseManagerId("");
    setIntendedParentId("");
    setSurrogateId("");
    if (isMyCases) syncMyCasesUrl(1, "", "", "", "", "");
    else syncUrl(stage, 1, "", "", "", "", "");
  }

  return (
    <div className="ami-ui crm-font-ui text-sage-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {variant === "full" ? (
            <>
              <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">
                {headingMode === "admin" ? t("pages.admin_dashboard_heading") : t("pages.dashboard_heading")}
              </h1>
              <p className="mt-1 text-sm text-sage-700">
                {headingMode === "admin" ? t("admin_dash.welcome_sub") : t("am_dash.welcome_sub")}
              </p>
            </>
          ) : null}
          {variant === "stageList" ? (
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">
                {headingMode === "admin" ? t("pages.admin_cases_heading") : t("pages.cases_heading")}
              </h1>
              {headerExtra}
            </div>
          ) : null}
          {variant === "myCases" ? (
            <>
              <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t("pages.my_cases_heading")}</h1>
              <p className="mt-1 text-sm text-sage-700">{t("am_dash.my_cases_intro")}</p>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="ami-ui shrink-0 inline-flex items-center gap-1 rounded-full border border-sage-300 bg-white/95 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sage-800 shadow-sm hover:bg-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
          {t("am_dash.refresh")}
        </button>
      </div>

      {variant === "full" ? (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {CANONICAL_CASE_STAGES.map((s, i) => {
            const count = data?.counts?.[s];
            const n = typeof count === "number" ? count : "—";
            const active = stage === s;
            const Icon = AM_STAGE_ICON_COMPONENTS[i]!;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSelectStage(s)}
                className={`flex flex-col rounded-xl px-3 py-3 text-left transition hover:shadow md:px-4 md:py-4 ${CARD_ACCENT[i % CARD_ACCENT.length]} ${active ? "ring-2 ring-brand-brown ring-offset-2 ring-offset-background" : ""}`}
              >
                <span className="mb-2 text-brand-brown/90">
                  <Icon className="h-6 w-6" aria-hidden strokeWidth={1.75} />
                </span>
                <span className="line-clamp-2 text-xs font-semibold leading-snug text-sage-900 md:text-[13px] crm-font-display">
                  {translateProcessStatus(s, tStage)}
                </span>
                <span className="mt-2 text-2xl font-bold tabular-nums text-sage-800">{n}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <section className="rounded-xl border border-sage-200/80 bg-white/40 p-4 shadow-sm backdrop-blur-[1px] md:p-6">
        <div className="mb-4 space-y-3">
          {variant !== "myCases" ? (
            <p className="crm-font-display text-sm font-medium text-brand-brown md:text-base">
              {t("am_dash.filter_heading", {
                stage: translateProcessStatus(stage, tStage),
              })}
            </p>
          ) : (
            <p className="crm-font-display text-sm font-medium text-brand-brown md:text-base">
              {t("am_dash.my_cases_section_note")}
            </p>
          )}

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {headingMode === "admin" && variant !== "myCases" ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-sage-700">
                <span>{t("am_dash.filter_case_manager")}</span>
                <select
                  value={caseManagerId}
                  onChange={(e) => setCaseManagerId(e.target.value)}
                  className="rounded-md border border-sage-300 bg-white px-2 py-2 text-sm text-sage-900"
                >
                  <option value="">{t("am_dash.all_people")}</option>
                  {caseManagerOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-xs font-medium text-sage-700">
              <span>{t("am_dash.filter_intended_parent")}</span>
              <select
                value={intendedParentId}
                onChange={(e) => setIntendedParentId(e.target.value)}
                className="rounded-md border border-sage-300 bg-white px-2 py-2 text-sm text-sage-900"
              >
                <option value="">{t("am_dash.all_people")}</option>
                {intendedParentOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-sage-700">
              <span>{t("am_dash.filter_surrogate")}</span>
              <select
                value={surrogateId}
                onChange={(e) => setSurrogateId(e.target.value)}
                className="rounded-md border border-sage-300 bg-white px-2 py-2 text-sm text-sage-900"
              >
                <option value="">{t("am_dash.all_people")}</option>
                {surrogateOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {isMyCases ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-sage-700">
                <span>{t("am_dash.filter_status")}</span>
                <select
                  value={processStatus}
                  onChange={(e) => setProcessStatus(e.target.value)}
                  className="rounded-md border border-sage-300 bg-white px-2 py-2 text-sm text-sage-900"
                >
                  <option value="">{t("am_dash.all_status")}</option>
                  {CANONICAL_CASE_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {translateProcessStatus(s, tStage)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto]">
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder={t("am_dash.search_placeholder")}
              className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm text-sage-900"
            />
            <button
              type="button"
              onClick={onApplyFilters}
              className="rounded-md bg-sage-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sage-800"
            >
              {t("am_dash.search")}
            </button>
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm font-semibold text-sage-800 hover:bg-sage-50"
            >
              {t("am_dash.reset")}
            </button>
          </div>
        </div>

        {errorKey ? (
          <p className="text-sm text-red-700">{t(errorKey)}</p>
        ) : loading && !data ? (
          <p className="text-sm text-sage-600">{tCommon("loading")}</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-sage-200/80 bg-white">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-sage-200 bg-sage-100 text-xs font-semibold uppercase tracking-wide text-sage-700">
                    <th className="px-4 py-3">{t("am_dash.col_case_id")}</th>
                    <th className="px-4 py-3">{t("am_dash.col_surrogate")}</th>
                    <th className="px-4 py-3">{t("am_dash.col_parents")}</th>
                    <th className="px-4 py-3">{t("am_dash.col_updated")}</th>
                    <th className="px-4 py-3">{t("am_dash.col_action")}</th>
                  </tr>
                </thead>
                <tbody className="text-sage-900">
                  {(data?.rows ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sage-600">
                        {t("am_dash.empty")}
                      </td>
                    </tr>
                  ) : (
                    (data?.rows ?? []).map((row) => {
                      return (
                        <tr key={row.id} className="border-b border-sage-100 hover:bg-sage-50/80">
                          <td className="px-4 py-3 tabular-nums">{row.id}</td>
                          <td className="px-4 py-3">{row.surrogateName}</td>
                          <td className="px-4 py-3">{row.intendedParentName}</td>
                          <td className="px-4 py-3 text-xs text-sage-700">
                            {formatDt(row.updated_at, i18n.language)}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`${detailHrefBase}/${row.id}`}
                              className="inline-flex rounded-md bg-sage-700 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-sage-800"
                            >
                              {t("am_dash.view_case")}
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-xs text-sage-700">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => onPageChange(page - 1)}
                className="rounded border border-sage-300 bg-white px-3 py-1 disabled:opacity-40"
              >
                {t("am_dash.prev")}
              </button>
              <span className="px-2">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => onPageChange(page + 1)}
                className="rounded border border-sage-300 bg-white px-3 py-1 disabled:opacity-40"
              >
                {t("am_dash.next")}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
