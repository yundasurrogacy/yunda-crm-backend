"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { EntitySearchSelect } from "@/components/ui/EntitySearchSelect";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AM_STAGE_ICON_COMPONENTS } from "@/constants/am-stage-icons";
import { CANONICAL_CASE_STAGES, isCanonicalCaseStage, type CanonicalCaseStage } from "@/constants/case-stages";
import type { AmCaseRow } from "@/lib/case-manager/fetch-dashboard-data";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";

type SelectOption = { id: string; label: string };
type MyCaseScope = "all" | "created" | "assigned";

function readMyCaseScope(sp: URLSearchParams | null): MyCaseScope {
  const s = sp?.get("scope");
  if (s === "created") return "created";
  if (s === "assigned") return "assigned";
  return "all";
}

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

function readStageFromSearch(sp: URLSearchParams | null): CanonicalCaseStage | "all" {
  const raw = sp?.get("stage");
  if (raw === "all") return "all";
  if (raw && isCanonicalCaseStage(raw)) return raw;
  return "all";
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
  const confirm = useConfirm();
  const { t: tCommon } = useTranslation("common");
  const { t: tStage } = useTranslation("caseStage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isMyCases = variant === "myCases";

  const [stage, setStage] = useState<CanonicalCaseStage | "all">(() =>
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
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [caseManagerOptions, setCaseManagerOptions] = useState<SelectOption[]>([]);
  const [intendedParentOptions, setIntendedParentOptions] = useState<SelectOption[]>([]);
  const [surrogateOptions, setSurrogateOptions] = useState<SelectOption[]>([]);
  const [myCaseScope, setMyCaseScope] = useState<MyCaseScope>(() => readMyCaseScope(searchParams));
  const [gcOptions, setGcOptions] = useState<SelectOption[]>([]);
  const [gcAssignTarget, setGcAssignTarget] = useState<string | null>(null);
  const [gcAssignValue, setGcAssignValue] = useState("");
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [reassignCmId, setReassignCmId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [reassignMsg, setReassignMsg] = useState<string | null>(null);

  const syncUrl = useCallback(
    (
      nextStage: CanonicalCaseStage | "all",
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
      nextScope: MyCaseScope,
      nextQ: string,
      nextProcessStatus: string,
      nextCm: string,
      nextIp: string,
      nextSm: string,
    ) => {
      const q = new URLSearchParams(searchParams?.toString() ?? "");
      q.set("page", String(nextPage));
      q.set("scope", nextScope);
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
    setMyCaseScope(readMyCaseScope(searchParams));
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
        const gcUrl =
          headingMode === "admin" ? "/api/admin/cases?options=gc" : "/api/case-manager/cases?options=gc";
        const gcRes = await fetch(gcUrl);
        if (gcRes.ok) {
          const gcJson = (await gcRes.json()) as { surrogates: SelectOption[] };
          if (!cancelled) setGcOptions(gcJson.surrogates ?? []);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiPath, headingMode, isMyCases]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      const stageParam = isMyCases || stage === "all" ? "all" : stage;
      const countsParam = variant === "full" ? "" : "&counts=0";
      const url = new URL(apiPath, window.location.origin);
      url.searchParams.set("stage", stageParam);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", "10");
      if (countsParam) url.searchParams.set("counts", "0");
      if (q.trim()) url.searchParams.set("q", q.trim());
      if (isMyCases && processStatus.trim()) url.searchParams.set("processStatus", processStatus.trim());
      if (isMyCases) url.searchParams.set("scope", myCaseScope);
      if (caseManagerId.trim()) url.searchParams.set("caseManagerId", caseManagerId.trim());
      if (intendedParentId.trim()) url.searchParams.set("intendedParentId", intendedParentId.trim());
      if (surrogateId.trim()) url.searchParams.set("surrogateId", surrogateId.trim());
      if (includeArchived) url.searchParams.set("includeArchived", "1");
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
    myCaseScope,
    caseManagerId,
    intendedParentId,
    surrogateId,
    includeArchived,
    apiPath,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  function onSelectStage(s: CanonicalCaseStage | "all") {
    setStage(s);
    setProcessStatus("");
    setPage(1);
    syncUrl(s, 1, q, "", caseManagerId, intendedParentId, surrogateId);
  }

  function onPageChange(next: number) {
    const p = Math.min(Math.max(1, next), totalPages);
    setPage(p);
    if (isMyCases)
      syncMyCasesUrl(p, myCaseScope, q, processStatus, caseManagerId, intendedParentId, surrogateId);
    else syncUrl(stage, p, q, "", caseManagerId, intendedParentId, surrogateId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onApplyFilters() {
    setPage(1);
    setQ(qInput.trim());
    if (isMyCases)
      syncMyCasesUrl(
        1,
        myCaseScope,
        qInput.trim(),
        processStatus,
        caseManagerId,
        intendedParentId,
        surrogateId,
      );
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
    if (isMyCases) syncMyCasesUrl(1, myCaseScope, "", "", "", "", "");
    else syncUrl(stage, 1, "", "", "", "", "");
  }

  function onSwitchMyScope(next: MyCaseScope) {
    setMyCaseScope(next);
    setPage(1);
    syncMyCasesUrl(1, next, q, processStatus, caseManagerId, intendedParentId, surrogateId);
  }

  async function assignCaseManagerToMe(caseId: string) {
    await fetch(`/api/case-manager/cases/${caseId}/actions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign_case_manager" }),
    });
    await load();
  }

  const casesApiBase = headingMode === "admin" ? "/api/admin/cases" : "/api/case-manager/cases";

  async function softDeleteCase(caseId: string, archived: boolean) {
    if (archiveBusyId) return;
    const ok = await confirm({
      message: archived ? t("am_dash.soft_delete_confirm") : t("am_dash.restore_confirm"),
      danger: archived,
    });
    if (!ok) return;
    setArchiveBusyId(caseId);
    try {
      const res = await fetch(`${casesApiBase}/${encodeURIComponent(caseId)}/actions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: archived ? "archive" : "unarchive" }),
      });
      if (!res.ok) {
        setErrorKey("am_dash.error_soft_delete");
        return;
      }
      await load();
    } catch {
      setErrorKey("am_dash.error_soft_delete");
    } finally {
      setArchiveBusyId(null);
    }
  }

  async function assignGc(caseId: string) {
    if (!gcAssignValue.trim()) return;
    await fetch(`${casesApiBase}/${caseId}/actions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "match_gc", surrogateId: gcAssignValue.trim() }),
    });
    setGcAssignTarget(null);
    setGcAssignValue("");
    await load();
  }

  const rowIds = useMemo(() => (data?.rows ?? []).map((r) => r.id), [data?.rows]);
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selectedCaseIds.includes(id));

  function toggleSelectAll() {
    setSelectedCaseIds(allSelected ? [] : rowIds);
  }

  function toggleSelectOne(id: string) {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function bulkReassign() {
    if (headingMode !== "admin" || !reassignCmId || selectedCaseIds.length === 0 || reassigning) return;
    setReassigning(true);
    setReassignMsg(null);
    try {
      const res = await fetch("/api/admin/cases/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseIds: selectedCaseIds, caseManagerId: reassignCmId }),
      });
      const json = (await res.json().catch(() => ({}))) as { affected?: number; error?: string };
      if (!res.ok) {
        setReassignMsg(t("am_dash.reassign_error"));
        return;
      }
      setReassignMsg(t("am_dash.reassign_success", { count: json.affected ?? selectedCaseIds.length }));
      setSelectedCaseIds([]);
      await load();
    } catch {
      setReassignMsg(t("am_dash.reassign_error"));
    } finally {
      setReassigning(false);
    }
  }

  return (
    <div className="ami-ui crm-font-ui crm-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
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
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t("pages.my_cases_heading")}</h1>
                {headerExtra}
              </div>
              <p className="mt-1 text-sm text-sage-700">{t("am_dash.my_cases_intro")}</p>
              <div className="mt-3 inline-flex rounded-md border border-sage-300 bg-white p-1">
                <button
                  type="button"
                  onClick={() => onSwitchMyScope("all")}
                  className={`rounded px-3 py-1 text-xs font-semibold ${myCaseScope === "all" ? "bg-sage-700 text-white" : "text-sage-700"}`}
                >
                  {t("am_dash.scope_all")}
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchMyScope("created")}
                  className={`rounded px-3 py-1 text-xs font-semibold ${myCaseScope === "created" ? "bg-sage-700 text-white" : "text-sage-700"}`}
                >
                  {t("am_dash.scope_created")}
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchMyScope("assigned")}
                  className={`rounded px-3 py-1 text-xs font-semibold ${myCaseScope === "assigned" ? "bg-sage-700 text-white" : "text-sage-700"}`}
                >
                  {t("am_dash.scope_assigned")}
                </button>
              </div>
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {(() => {
            const totalAll =
              data?.counts &&
              CANONICAL_CASE_STAGES.reduce((sum, s) => sum + (data.counts?.[s] ?? 0), 0);
            return (
              <button
                type="button"
                onClick={() => onSelectStage("all")}
                className={`flex flex-col rounded-xl px-3 py-3 text-left transition hover:shadow md:px-4 md:py-4 ${CARD_ACCENT[0]} ${stage === "all" ? "ring-2 ring-brand-brown ring-offset-2 ring-offset-background" : ""}`}
              >
                <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-brown/80">
                  {t("am_dash.stage_all_eyebrow")}
                </span>
                <span className="line-clamp-2 text-xs font-semibold leading-snug text-sage-900 md:text-[13px] crm-font-display">
                  {t("am_dash.stage_all")}
                </span>
                <span className="mt-2 text-2xl font-bold tabular-nums text-sage-800">
                  {typeof totalAll === "number" ? totalAll : "—"}
                </span>
              </button>
            );
          })()}
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
                className={`flex flex-col rounded-xl px-3 py-3 text-left transition hover:shadow md:px-4 md:py-4 ${CARD_ACCENT[(i + 1) % CARD_ACCENT.length]} ${active ? "ring-2 ring-brand-brown ring-offset-2 ring-offset-background" : ""}`}
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

      {variant === "stageList" ? (
        <div>
          <label className="flex max-w-sm flex-col gap-1 text-xs font-medium text-sage-700">
            <span>{t("am_dash.filter_stage")}</span>
            <SelectMenu
              searchable
              value={stage}
              onChange={(v) => {
                onSelectStage(v === "all" || isCanonicalCaseStage(v) ? v : "all");
              }}
              options={[
                { value: "all", label: t("am_dash.stage_all") },
                ...CANONICAL_CASE_STAGES.map((s) => ({
                  value: s,
                  label: translateProcessStatus(s, tStage),
                })),
              ]}
            />
          </label>
        </div>
      ) : null}

      <section className="crm-card crm-card-soft">
        <div className="mb-4 space-y-3">
          {variant !== "myCases" ? (
            <p className="crm-font-display text-sm font-medium text-brand-brown md:text-base">
              {stage === "all"
                ? t("am_dash.filter_heading_all")
                : t("am_dash.filter_heading", {
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
                <EntitySearchSelect
                  options={caseManagerOptions}
                  value={caseManagerId}
                  onChange={setCaseManagerId}
                  placeholder={t("entity_search.placeholder")}
                  emptyLabel={t("am_dash.all_people")}
                  allowEmpty
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-xs font-medium text-sage-700">
              <span>{t("am_dash.filter_intended_parent")}</span>
              <EntitySearchSelect
                options={intendedParentOptions}
                value={intendedParentId}
                onChange={setIntendedParentId}
                placeholder={t("entity_search.placeholder")}
                emptyLabel={t("am_dash.all_people")}
                allowEmpty
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-sage-700">
              <span>{t("am_dash.filter_surrogate")}</span>
              <EntitySearchSelect
                options={surrogateOptions}
                value={surrogateId}
                onChange={setSurrogateId}
                placeholder={t("entity_search.placeholder")}
                emptyLabel={t("am_dash.all_people")}
                allowEmpty
              />
            </label>
            {isMyCases ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-sage-700">
                <span>{t("am_dash.filter_status")}</span>
                <SelectMenu
                  searchable
                  value={processStatus}
                  onChange={setProcessStatus}
                  options={[
                    { value: "", label: t("am_dash.all_status") },
                    ...CANONICAL_CASE_STAGES.map((s) => ({
                      value: s,
                      label: translateProcessStatus(s, tStage),
                    })),
                  ]}
                />
              </label>
            ) : null}
          </div>

          <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto_auto]">
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
            <label className="inline-flex items-center gap-2 self-center text-xs text-sage-700">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => {
                  setIncludeArchived(e.target.checked);
                  setPage(1);
                }}
              />
              {t("am_dash.show_deleted")}
            </label>
          </div>
        </div>

        {headingMode === "admin" ? (
          <div className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-sage-200 bg-sage-50/70 p-3">
            <p className="w-full text-xs font-medium text-sage-700">
              {t("am_dash.reassign_hint", { count: selectedCaseIds.length })}
            </p>
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-sage-700">
              <span>{t("am_dash.reassign_to")}</span>
              <EntitySearchSelect
                options={caseManagerOptions}
                value={reassignCmId}
                onChange={setReassignCmId}
                placeholder={t("entity_search.placeholder")}
                emptyLabel={t("am_dash.pick_cm")}
                allowEmpty
              />
            </label>
            <button
              type="button"
              disabled={reassigning || selectedCaseIds.length === 0 || !reassignCmId}
              onClick={() => void bulkReassign()}
              className="rounded-md bg-brand-brown px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {reassigning ? t("am_dash.reassigning") : t("am_dash.reassign_submit")}
            </button>
            {reassignMsg ? <p className="w-full text-xs text-sage-800">{reassignMsg}</p> : null}
          </div>
        ) : null}

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
                    {headingMode === "admin" ? (
                      <th className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label={t("am_dash.select_all")}
                        />
                      </th>
                    ) : null}
                    <th className="px-4 py-3">{t("am_dash.col_case_id")}</th>
                    <th className="px-4 py-3">{t("am_dash.col_surrogate")}</th>
                    <th className="px-4 py-3">{t("am_dash.col_parents")}</th>
                    {stage === "all" || isMyCases ? (
                      <th className="px-4 py-3">{t("am_dash.col_stage")}</th>
                    ) : null}
                    <th className="px-4 py-3">{t("am_dash.col_updated")}</th>
                    <th className="px-4 py-3">{t("am_dash.col_status")}</th>
                    <th className="px-4 py-3">{t("am_dash.col_action")}</th>
                  </tr>
                </thead>
                <tbody className="text-sage-900">
                  {(data?.rows ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          (headingMode === "admin" ? 7 : 6) + (stage === "all" || isMyCases ? 1 : 0)
                        }
                        className="px-4 py-8 text-center text-sage-600"
                      >
                        {t("am_dash.empty")}
                      </td>
                    </tr>
                  ) : (
                    (data?.rows ?? []).map((row) => {
                      const isDeleted = Boolean(row.archived_at);
                      return (
                        <tr
                          key={row.id}
                          className={[
                            "border-b border-sage-100 hover:bg-sage-50/80",
                            isDeleted ? "bg-sage-50/80 text-sage-500" : "",
                          ].join(" ")}
                        >
                          {headingMode === "admin" ? (
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={selectedCaseIds.includes(row.id)}
                                onChange={() => toggleSelectOne(row.id)}
                                aria-label={row.id}
                                disabled={isDeleted}
                              />
                            </td>
                          ) : null}
                          <td className="px-4 py-3 tabular-nums">{row.id}</td>
                          <td className="px-4 py-3">{row.surrogateName}</td>
                          <td className="px-4 py-3">{row.intendedParentName}</td>
                          {stage === "all" || isMyCases ? (
                            <td className="px-4 py-3 text-xs text-sage-800">
                              {translateProcessStatus(row.process_status ?? "", tStage) ||
                                row.process_status ||
                                "—"}
                            </td>
                          ) : null}
                          <td className="px-4 py-3 text-xs text-sage-700">
                            {formatDt(row.updated_at, i18n.language)}
                          </td>
                          <td className="px-4 py-3">
                            {isDeleted ? (
                              <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
                                {t("am_dash.status_deleted")}
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                {t("am_dash.status_active")}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`${detailHrefBase}/${row.id}`}
                                className="inline-flex rounded-md bg-sage-700 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-sage-800"
                              >
                                {t("am_dash.view_case")}
                              </Link>
                              {isDeleted ? (
                                <button
                                  type="button"
                                  disabled={archiveBusyId === row.id}
                                  onClick={() => void softDeleteCase(row.id, false)}
                                  className="inline-flex rounded-md border border-emerald-700 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
                                >
                                  {t("am_dash.btn_restore")}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={archiveBusyId === row.id}
                                  onClick={() => void softDeleteCase(row.id, true)}
                                  className="inline-flex rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {t("am_dash.btn_soft_delete")}
                                </button>
                              )}
                              {!isDeleted && isMyCases && myCaseScope === "created" && !row.caseManagerId ? (
                                <button
                                  type="button"
                                  onClick={() => void assignCaseManagerToMe(row.id)}
                                  className="inline-flex rounded-md border border-sage-400 bg-white px-3 py-1.5 text-xs font-semibold text-sage-800 hover:bg-sage-50"
                                >
                                  {t("am_dash.assign_case_manager_to_me")}
                                </button>
                              ) : null}
                              {!isDeleted && !row.surrogateId ? (
                                gcAssignTarget === row.id ? (
                                  <div className="inline-flex min-w-[14rem] max-w-[20rem] items-center gap-1">
                                    <EntitySearchSelect
                                      className="min-w-0 flex-1"
                                      options={gcOptions}
                                      value={gcAssignValue}
                                      onChange={setGcAssignValue}
                                      placeholder={t("entity_search.placeholder")}
                                      emptyLabel={t("am_dash.pick_gc")}
                                      allowEmpty
                                    />
                                    <button
                                      type="button"
                                      onClick={() => void assignGc(row.id)}
                                      className="shrink-0 rounded-md border border-sage-400 bg-white px-2 py-1 text-xs font-semibold text-sage-800 hover:bg-sage-50"
                                    >
                                      {t("am_dash.confirm_gc_match")}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGcAssignTarget(row.id);
                                      setGcAssignValue("");
                                    }}
                                    className="inline-flex rounded-md border border-sage-400 bg-white px-3 py-1.5 text-xs font-semibold text-sage-800 hover:bg-sage-50"
                                  >
                                    {t("am_dash.gc_match")}
                                  </button>
                                )
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-sage-700">
              <p className="min-w-0">
                {t("am_dash.list_stats", {
                  total: data.total,
                  from: data.total === 0 ? 0 : (page - 1) * data.pageSize + 1,
                  to: Math.min(page * data.pageSize, data.total),
                })}
              </p>
              <div className="flex items-center gap-2">
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
            </div>
          </>
        )}
      </section>
    </div>
  );
}
