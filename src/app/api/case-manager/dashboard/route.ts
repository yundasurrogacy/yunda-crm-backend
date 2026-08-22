import { NextResponse } from "next/server";
import { isCanonicalCaseStage, type CanonicalCaseStage } from "@/constants/case-stages";
import {
  fetchCasesPage,
  fetchStageCounts,
  resolveCaseManagerEntityId,
  type CasesListScope,
} from "@/lib/case-manager/fetch-dashboard-data";

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
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10) || 10));
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

  try {
    if (skipCounts) {
      const list = await fetchCasesPage(
        session,
        listStage,
        page,
        pageSize,
        filters,
        listScope,
        resolvedCmId,
      );
      return NextResponse.json({
        stage: listStage,
        counts: null,
        ...list,
        page,
        pageSize,
      });
    }

    const [counts, list] = await Promise.all([
      fetchStageCounts(session, listScope, resolvedCmId, filters.includeArchived),
      fetchCasesPage(session, listStage, page, pageSize, filters, listScope, resolvedCmId),
    ]);
    return NextResponse.json({
      stage: listStage,
      counts,
      ...list,
      page,
      pageSize,
    });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
