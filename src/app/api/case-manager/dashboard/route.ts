import { NextResponse } from "next/server";
import { isCanonicalCaseStage, type CanonicalCaseStage } from "@/constants/case-stages";
import {
  fetchCasesPage,
  fetchStageCounts,
  resolveCaseManagerEntityId,
  type CasesListScope,
} from "@/lib/case-manager/fetch-dashboard-data";
import { fetchCmFilterOptions } from "@/lib/case-manager/fetch-cm-filter-options";
import { parseIncludeParam } from "@/lib/http/parse-include";

import { getServerSession } from "@/lib/auth/session-cookie";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const stageRaw = searchParams.get("stage");
  const allStagesScope = stageRaw === "all" || stageRaw == null || stageRaw === "";
  let stage: CanonicalCaseStage | "all" = "all";
  if (!allStagesScope) {
    stage = isCanonicalCaseStage(stageRaw) ? stageRaw : "all";
  }

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));
  const skipCounts = searchParams.get("counts") === "0";
  const scopeRaw = searchParams.get("scope");
  const listScope: CasesListScope = (() => {
    if (scopeRaw === "created") return "case_manager_created";
    if (scopeRaw === "assigned") return "case_manager_assigned";
    // 默认（含工作台阶段卡片）：我创建 ∪ 我负责，避免漏案
    return "case_manager_all";
  })();
  const filters = {
    q: searchParams.get("q") ?? undefined,
    processStatus: searchParams.get("processStatus") ?? undefined,
    caseManagerId: searchParams.get("caseManagerId") ?? undefined,
    intendedParentId: searchParams.get("intendedParentId") ?? undefined,
    surrogateId: searchParams.get("surrogateId") ?? undefined,
    includeArchived: searchParams.get("includeArchived") === "1",
  };

  const resolvedCmId = await resolveCaseManagerEntityId(session);
  const listStage: CanonicalCaseStage | "all" = stage === "all" ? "all" : stage;
  const include = parseIncludeParam(searchParams.get("include"));

  try {
    const listPromise = skipCounts
      ? fetchCasesPage(
          session,
          listStage,
          page,
          pageSize,
          filters,
          listScope,
          resolvedCmId,
        ).then((list) => ({
          stage: listStage,
          counts: null as Record<string, number> | null,
          ...list,
          page,
          pageSize,
        }))
      : Promise.all([
          fetchStageCounts(session, listScope, resolvedCmId, filters.includeArchived),
          fetchCasesPage(session, listStage, page, pageSize, filters, listScope, resolvedCmId),
        ]).then(([counts, list]) => ({
          stage: listStage,
          counts,
          ...list,
          page,
          pageSize,
        }));

    const [listResult, optionsResult] = await Promise.allSettled([
      listPromise,
      include.has("options") ? fetchCmFilterOptions(session, resolvedCmId) : Promise.resolve(null),
    ]);
    if (listResult.status === "rejected") {
      console.error("[cm/dashboard GET list]", listResult.reason);
      return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
    }
    const options = optionsResult.status === "fulfilled" ? optionsResult.value : null;
    if (optionsResult.status === "rejected") {
      console.error("[cm/dashboard GET options]", optionsResult.reason);
    }
    return NextResponse.json({
      ...listResult.value,
      ...(options ?? {}),
    });
  } catch (e) {
    console.error("[cm/dashboard GET]", e);
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
