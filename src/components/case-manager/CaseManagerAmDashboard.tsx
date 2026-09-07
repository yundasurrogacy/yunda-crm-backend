"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { EntitySearchSelect } from "@/components/ui/EntitySearchSelect";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { CrmModal } from "@/components/ui/CrmModal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AdminCreateCaseForm } from "@/components/admin/AdminCreateCaseForm";
import { CaseManagerCreateCaseForm } from "@/components/case-manager/CaseManagerCreateCaseForm";
import { AM_STAGE_ICON_COMPONENTS } from "@/constants/am-stage-icons";
import { CANONICAL_CASE_STAGES, isCanonicalCaseStage, type CanonicalCaseStage } from "@/constants/case-stages";
import type { AmCaseRow } from "@/lib/case-manager/fetch-dashboard-data";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";
import {
  cacheListPayload,
  readCachedListPayload,
  rememberListReturn,
  restoreMainScroll,
} from "@/lib/crm-list-return";
import { hrefWithReturnTo } from "@/lib/use-synced-list-query";
import { DEFAULT_PAGE_SIZE, parsePageSize, type PageSizeOption } from "@/lib/crm-pagination";
import { ListPager } from "@/components/ui/ListPager";

type SelectOption = { id: string; label: string };
type MyCaseScope = "all" | "created" | "assigned";

function readMyCaseScope(sp: URLSearchParams | null): MyCaseScope {
  const s = sp?.get("scope");
  if (s === "created") return "created";
  if (s === "assigned") return "assigned";
  return "all";
}

const CARD_ACCENT = [
  "border border-sage-200 bg-[var(--card-background)] text-brand-brown shadow-sm hover:border-maple/35 hover:bg-[#f7f1e6]",
  "border border-sage-300 bg-[#faf7f1] text-brand-brown shadow-sm hover:border-maple/35 hover:bg-[#f7f1e6]",
] as const;

function stageCardClass(active: boolean, accent: string) {
  return [
    "flex min-h-[7.25rem] flex-col rounded-xl px-3 py-3 text-left transition md:min-h-[7.75rem] md:px-3.5 md:py-3.5",
    active
      ? "border border-maple/35 bg-[#f3e2cc] text-bark shadow-sm"
      : accent,
  ].join(" ");
}

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
  createCaseMode = false,
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
  /** 标题行右侧附加内容 */
  headerExtra?: ReactNode;
  /** 案例列表：在表格上方打开创建弹窗 */
  createCaseMode?: false | "admin" | "case_manager";
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
  const [pageSize, setPageSize] = useState<PageSizeOption>(() => parsePageSize(searchParams.get("pageSize")));
  const [q, setQ] = useState(() => readTextParam(searchParams, "q"));
  const [processStatus, setProcessStatus] = useState(() => readTextParam(searchParams, "processStatus"));
  const [caseManagerId, setCaseManagerId] = useState(() => readTextParam(searchParams, "caseManagerId"));
  const [intendedParentId, setIntendedParentId] = useState(() =>
    readTextParam(searchParams, "intendedParentId"),
  );
  const [surrogateId, setSurrogateId] = useState(() => readTextParam(searchParams, "surrogateId"));
  const [qInput, setQInput] = useState(() => readTextParam(searchParams, "q"));
  const [includeArchived, setIncludeArchived] = useState(
    () => searchParams.get("includeArchived") === "1",
  );
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(() => searchParams.get("create") === "1");
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
  const dataRef = useRef<DashboardPayload | null>(null);
  dataRef.current = data;

  const syncUrl = useCallback(
    (
      nextStage: CanonicalCaseStage | "all",
      nextPage: number,
      nextQ: string,
      nextProcessStatus: string,
      nextCm: string,
      nextIp: string,
      nextSm: string,
      nextPageSize?: number,
    ) => {
      const q = new URLSearchParams(searchParams?.toString() ?? "");
      q.set("stage", nextStage);
      q.set("page", String(nextPage));
      const size = nextPageSize ?? pageSize;
      if (size !== DEFAULT_PAGE_SIZE) q.set("pageSize", String(size));
      else q.delete("pageSize");
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
    [pathname, router, searchParams, pageSize],
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
      nextPageSize?: number,
    ) => {
      const q = new URLSearchParams(searchParams?.toString() ?? "");
      q.set("page", String(nextPage));
      q.set("scope", nextScope);
      const size = nextPageSize ?? pageSize;
      if (size !== DEFAULT_PAGE_SIZE) q.set("pageSize", String(size));
      else q.delete("pageSize");
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
    [pathname, router, searchParams, pageSize],
  );

  useEffect(() => {
    const p = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    setMyCaseScope(readMyCaseScope(searchParams));
    setPage(p);
    setPageSize(parsePageSize(searchParams.get("pageSize")));
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
    setIncludeArchived(searchParams.get("includeArchived") === "1");
  }, [searchParams, isMyCases]);

  useEffect(() => {
    if (searchParams.get("create") !== "1" || !createCaseMode) return;
    setCreateOpen(true);
    const q = new URLSearchParams(searchParams.toString());
    q.delete("create");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [createCaseMode, pathname, router, searchParams]);

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
    setErrorKey(null);
    setLoading((prev) => (dataRef.current ? prev : true));
    try {
      const stageParam = isMyCases || stage === "all" ? "all" : stage;
      const countsParam = variant === "full" ? "" : "&counts=0";
      const url = new URL(apiPath, window.location.origin);
      url.searchParams.set("stage", stageParam);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));
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
      cacheListPayload(`crm:list:${window.location.pathname}${window.location.search}`, json);
      const maxPage = Math.max(1, Math.ceil((json.total ?? 0) / (json.pageSize || pageSize)));
      if (page > maxPage) {
        setPage(maxPage);
        if (isMyCases) {
          syncMyCasesUrl(maxPage, myCaseScope, q, processStatus, caseManagerId, intendedParentId, surrogateId);
        } else {
          syncUrl(stage, maxPage, q, "", caseManagerId, intendedParentId, surrogateId);
        }
      }
    } catch {
      setErrorKey("am_dash.error_data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [
    stage,
    page,
    pageSize,
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
    syncUrl,
    syncMyCasesUrl,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const didRestoreScroll = useRef(false);
  useEffect(() => {
    if (didRestoreScroll.current || !data) return;
    didRestoreScroll.current = true;
    restoreMainScroll(`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`);
  }, [data, pathname, searchParams]);

  useEffect(() => {
    const cached = readCachedListPayload<DashboardPayload>(
      `crm:list:${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
    );
    if (cached && !dataRef.current) {
      setData(cached);
      setLoading(false);
    }
  }, [pathname, searchParams]);

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
    document.querySelector(".crm-table-scroll")?.scrollTo({ top: 0 });
  }

  function onPageSizeChange(next: PageSizeOption) {
    setPageSize(next);
    setPage(1);
    if (isMyCases)
      syncMyCasesUrl(1, myCaseScope, q, processStatus, caseManagerId, intendedParentId, surrogateId, next);
    else syncUrl(stage, 1, q, "", caseManagerId, intendedParentId, surrogateId, next);
    document.querySelector(".crm-table-scroll")?.scrollTo({ top: 0 });
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

  const filterFieldClass = "flex min-w-0 flex-col gap-1 text-xs font-medium text-sage-700";

  return (
    <div className={variant === "full" ? "ami-ui crm-font-ui flex w-full shrink-0 flex-col gap-4" : "ami-ui crm-font-ui crm-fill-page"}>
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {variant === "full" ? (
            <>
              <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">
                {headingMode === "admin" ? t("pages.admin_dashboard_heading") : t("pages.dashboard_heading")}
              </h1>
              <p className="mt-0.5 text-sm text-sage-700">
                {headingMode === "admin" ? t("admin_dash.welcome_sub") : t("am_dash.welcome_sub")}
              </p>
            </>
          ) : null}
          {variant === "stageList" ? (
            <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">
              {headingMode === "admin" ? t("pages.admin_cases_heading") : t("pages.cases_heading")}
            </h1>
          ) : null}
          {variant === "myCases" ? (
            <>
              <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t("pages.my_cases_heading")}</h1>
              {headerExtra}
              <p className="mt-0.5 text-sm text-sage-700">{t("am_dash.my_cases_intro")}</p>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {isMyCases ? (
            <div className="inline-flex rounded-md border border-sage-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => onSwitchMyScope("all")}
                className={`rounded px-2.5 py-1.5 text-xs font-semibold ${myCaseScope === "all" ? "bg-bark text-petal" : "text-bark"}`}
              >
                {t("am_dash.scope_all")}
              </button>
              <button
                type="button"
                onClick={() => onSwitchMyScope("created")}
                className={`rounded px-2.5 py-1.5 text-xs font-semibold ${myCaseScope === "created" ? "bg-bark text-petal" : "text-bark"}`}
              >
                {t("am_dash.scope_created")}
              </button>
              <button
                type="button"
                onClick={() => onSwitchMyScope("assigned")}
                className={`rounded px-2.5 py-1.5 text-xs font-semibold ${myCaseScope === "assigned" ? "bg-bark text-petal" : "text-bark"}`}
              >
                {t("am_dash.scope_assigned")}
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="crm-btn crm-btn-secondary crm-btn-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
            {t("am_dash.refresh")}
          </button>
          {createCaseMode ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="crm-btn crm-btn-primary crm-btn-sm"
            >
              {t(createCaseMode === "admin" ? "nav.admin.create_case" : "cm_case.create_submit")}
            </button>
          ) : null}
        </div>
      </div>

      {variant === "full" ? (
        <div className="grid shrink-0 grid-cols-2 gap-3 p-0.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {(() => {
            const totalAll =
              data?.counts &&
              CANONICAL_CASE_STAGES.reduce((sum, s) => sum + (data.counts?.[s] ?? 0), 0);
            return (
              <button
                type="button"
                onClick={() => onSelectStage("all")}
                className={stageCardClass(stage === "all", CARD_ACCENT[0])}
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
                className={stageCardClass(active, CARD_ACCENT[(i + 1) % CARD_ACCENT.length])}
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

      <section className={variant === "full" ? "crm-card !p-0" : "crm-card crm-card-list !p-0 overflow-hidden"}>
        <div className="crm-toolbar">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {variant === "stageList" ? (
              <label className={filterFieldClass}>
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
            ) : null}
            {headingMode === "admin" && variant !== "myCases" ? (
              <label className={filterFieldClass}>
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
            <label className={filterFieldClass}>
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
            <label className={filterFieldClass}>
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
              <label className={filterFieldClass}>
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

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onApplyFilters();
              }}
              placeholder={t("am_dash.search_placeholder")}
              className="min-w-0 flex-1 rounded-md border border-sage-300 bg-white px-3 py-2 text-sm text-sage-900"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onApplyFilters} className="crm-btn crm-btn-primary crm-btn-sm">
                {t("am_dash.search")}
              </button>
              <button type="button" onClick={onResetFilters} className="crm-btn crm-btn-secondary crm-btn-sm">
                {t("am_dash.reset")}
              </button>
              <label className="inline-flex items-center gap-2 text-xs text-sage-700">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => {
                    setIncludeArchived(e.target.checked);
                    setPage(1);
                    const next = new URLSearchParams(searchParams.toString());
                    if (e.target.checked) next.set("includeArchived", "1");
                    else next.delete("includeArchived");
                    next.set("page", "1");
                    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
                  }}
                />
                {t("am_dash.show_deleted")}
              </label>
            </div>
          </div>
        </div>

        {headingMode === "admin" && (selectedCaseIds.length > 0 || reassignMsg) ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-sage-200 bg-petal/70 px-4 py-2.5 md:px-6">
            <p className="mr-auto text-xs font-medium text-sage-700">
              {t("am_dash.reassign_hint", { count: selectedCaseIds.length })}
            </p>
            <label className="flex min-w-[12rem] max-w-sm flex-1 items-center gap-2 text-xs font-medium text-sage-700">
              <span className="shrink-0">{t("am_dash.reassign_to")}</span>
              <div className="min-w-0 flex-1">
                <EntitySearchSelect
                  options={caseManagerOptions}
                  value={reassignCmId}
                  onChange={setReassignCmId}
                  placeholder={t("entity_search.placeholder")}
                  emptyLabel={t("am_dash.pick_cm")}
                  allowEmpty
                />
              </div>
            </label>
            <button
              type="button"
              disabled={reassigning || selectedCaseIds.length === 0 || !reassignCmId}
              onClick={() => void bulkReassign()}
              className="crm-btn crm-btn-primary crm-btn-sm"
            >
              {reassigning ? t("am_dash.reassigning") : t("am_dash.reassign_submit")}
            </button>
            {reassignMsg ? <p className="w-full text-xs text-sage-800">{reassignMsg}</p> : null}
          </div>
        ) : null}

        {errorKey ? (
          <p className="px-4 py-6 text-sm text-red-700 md:px-6">{t(errorKey)}</p>
        ) : loading && !data ? (
          <p className="px-4 py-6 text-sm text-sage-600 md:px-6">{tCommon("loading")}</p>
        ) : (
          <>
            <div className={variant === "full" ? "crm-table-scroll crm-table-scroll-auto" : "crm-table-scroll"}>
              <table className="crm-table w-full min-w-[880px]">
                <thead>
                  <tr>
                    {headingMode === "admin" ? (
                      <th className="crm-freeze-check">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label={t("am_dash.select_all")}
                        />
                      </th>
                    ) : null}
                    <th className={headingMode === "admin" ? "crm-freeze-id" : "crm-freeze-id crm-freeze-id-first"}>
                      {t("am_dash.col_case_id")}
                    </th>
                    <th>{t("am_dash.col_surrogate")}</th>
                    <th>{t("am_dash.col_parents")}</th>
                    {stage === "all" || isMyCases ? (
                      <th>{t("am_dash.col_stage")}</th>
                    ) : null}
                    <th>{t("am_dash.col_updated")}</th>
                    <th>{t("am_dash.col_status")}</th>
                    <th className="crm-freeze-end">{t("am_dash.col_action")}</th>
                  </tr>
                </thead>
                <tbody className="text-sage-900">
                  {(data?.rows ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          (headingMode === "admin" ? 7 : 6) + (stage === "all" || isMyCases ? 1 : 0)
                        }
                        className="px-4 py-10 text-center text-sage-600"
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
                            "hover:bg-sage-50/80",
                            isDeleted ? "is-deleted text-sage-500" : "",
                          ].join(" ")}
                        >
                          {headingMode === "admin" ? (
                            <td className="crm-freeze-check">
                              <input
                                type="checkbox"
                                checked={selectedCaseIds.includes(row.id)}
                                onChange={() => toggleSelectOne(row.id)}
                                aria-label={row.id}
                                disabled={isDeleted}
                              />
                            </td>
                          ) : null}
                          <td
                            className={`tabular-nums ${headingMode === "admin" ? "crm-freeze-id" : "crm-freeze-id crm-freeze-id-first"}`}
                          >
                            {row.id}
                          </td>
                          <td>{row.surrogateName}</td>
                          <td>{row.intendedParentName}</td>
                          {stage === "all" || isMyCases ? (
                            <td className="text-xs text-sage-800">
                              {translateProcessStatus(row.process_status ?? "", tStage) ||
                                row.process_status ||
                                "—"}
                            </td>
                          ) : null}
                          <td className="whitespace-nowrap text-xs text-sage-700">
                            {formatDt(row.updated_at, i18n.language)}
                          </td>
                          <td>
                            {isDeleted ? (
                              <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
                                {t("am_dash.status_deleted")}
                              </span>
                            ) : (
                              <span className="rounded bg-harvest/40 px-2 py-0.5 text-xs font-semibold text-bark">
                                {t("am_dash.status_active")}
                              </span>
                            )}
                          </td>
                          <td className="crm-freeze-end">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link
                                href={hrefWithReturnTo(
                                  `${detailHrefBase}/${row.id}`,
                                  `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
                                )}
                                onClick={() =>
                                  rememberListReturn(
                                    `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
                                  )
                                }
                                className="crm-btn crm-btn-secondary crm-btn-xs"
                              >
                                {t("am_dash.view_case")}
                              </Link>
                              {isDeleted ? (
                                <button
                                  type="button"
                                  disabled={archiveBusyId === row.id}
                                  onClick={() => void softDeleteCase(row.id, false)}
                                  className="crm-btn crm-btn-secondary crm-btn-xs"
                                >
                                  {t("am_dash.btn_restore")}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={archiveBusyId === row.id}
                                  onClick={() => void softDeleteCase(row.id, true)}
                                  className="crm-btn crm-btn-danger crm-btn-xs"
                                >
                                  {t("am_dash.btn_soft_delete")}
                                </button>
                              )}
                              {!isDeleted && isMyCases && myCaseScope === "created" && !row.caseManagerId ? (
                                <button
                                  type="button"
                                  onClick={() => void assignCaseManagerToMe(row.id)}
                                  className="crm-btn crm-btn-secondary crm-btn-xs"
                                >
                                  {t("am_dash.assign_case_manager_to_me")}
                                </button>
                              ) : null}
                              {!isDeleted && !row.surrogateId ? (
                                gcAssignTarget === row.id ? (
                                  <div className="inline-flex min-w-[14rem] max-w-[20rem] items-center gap-2">
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
                                      className="crm-btn crm-btn-primary crm-btn-xs shrink-0"
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
                                    className="crm-btn crm-btn-secondary crm-btn-xs"
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

            <ListPager
              page={Math.min(page, totalPages)}
              totalPages={totalPages}
              pageSize={pageSize}
              disabled={loading}
              stats={t("am_dash.list_stats", {
                total: data?.total ?? 0,
                from: !data || data.total === 0 ? 0 : (Math.min(page, totalPages) - 1) * data.pageSize + 1,
                to: data ? Math.min(Math.min(page, totalPages) * data.pageSize, data.total) : 0,
              })}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </>
        )}
      </section>
      {createCaseMode ? (
        <CrmModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title={t("admin_case.create_title")}
        >
          {createCaseMode === "admin" ? (
            <AdminCreateCaseForm
              variant="dialog"
              onCancel={() => setCreateOpen(false)}
              onCreated={() => {
                setCreateOpen(false);
                void load();
              }}
            />
          ) : (
            <CaseManagerCreateCaseForm
              variant="dialog"
              onCancel={() => setCreateOpen(false)}
              onCreated={() => {
                setCreateOpen(false);
                void load();
              }}
            />
          )}
        </CrmModal>
      ) : null}
    </div>
  );
}
