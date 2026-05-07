import { NextResponse } from "next/server";
import { CANONICAL_CASE_STAGES, isCanonicalCaseStage, type CanonicalCaseStage } from "@/constants/case-stages";
import {
  fetchCasesPage,
  fetchStageCounts,
  resolveCaseManagerEntityId,
  type CasesListScope,
} from "@/lib/case-manager/fetch-dashboard-data";

const CM_SCOPE = "case_manager_assigned" satisfies CasesListScope;
import { getServerSession } from "@/lib/auth/session-cookie";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const stageRaw = searchParams.get("stage");
  const allStagesScope = stageRaw === "all";
  let stage =
    stageRaw ??
    CANONICAL_CASE_STAGES[0];
  if (allStagesScope) {
    stage = "all";
  } else if (!isCanonicalCaseStage(stage)) {
    stage = CANONICAL_CASE_STAGES[0];
  }

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10) || 10));
  const skipCounts = searchParams.get("counts") === "0";
  const filters = {
    q: searchParams.get("q") ?? undefined,
    processStatus: searchParams.get("processStatus") ?? undefined,
    caseManagerId: searchParams.get("caseManagerId") ?? undefined,
    intendedParentId: searchParams.get("intendedParentId") ?? undefined,
    surrogateId: searchParams.get("surrogateId") ?? undefined,
  };

  const resolvedCmId = await resolveCaseManagerEntityId(session);

  try {
    if (skipCounts) {
      const list = await fetchCasesPage(
        session,
        stage as CanonicalCaseStage | "all",
        page,
        pageSize,
        filters,
        CM_SCOPE,
        resolvedCmId,
      );
      return NextResponse.json({
        stage,
        counts: null,
        ...list,
        page,
        pageSize,
      });
    }
    if (allStagesScope) {
      const list = await fetchCasesPage(session, "all", page, pageSize, filters, CM_SCOPE, resolvedCmId);
      return NextResponse.json({
        stage: "all",
        counts: null,
        ...list,
        page,
        pageSize,
      });
    }
    const [counts, list] = await Promise.all([
      fetchStageCounts(session, CM_SCOPE, resolvedCmId),
      fetchCasesPage(session, stage as CanonicalCaseStage, page, pageSize, filters, CM_SCOPE, resolvedCmId),
    ]);
    return NextResponse.json({
      stage,
      counts,
      ...list,
      page,
      pageSize,
    });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
