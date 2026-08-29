import { NextResponse } from "next/server";

import { getClient } from "@/config-lib/graphql-client";
import { getServerSession } from "@/lib/auth/session-cookie";
import {
  fetchActiveCaseTotals,
  fetchCaseManagerCaseloads,
} from "@/lib/admin/case-manager-caseload";

const LIST_CMS = `
  query AdminCmWorkloadList {
    case_managers(
      where: { deleted_at: { _is_null: true } }
      order_by: { id: asc }
      limit: 500
    ) {
      id
      user { email }
    }
  }
`;

/** 管理端：全部活跃案例经理的负责案例数（主 FK ∪ M2M） */
export async function GET() {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const client = getClient();
    const data = await client.execute<{
      case_managers: {
        id: string | number;
        user: { email: string | null } | null;
      }[];
    }>({ query: LIST_CMS });
    const managers = (data.case_managers ?? []).map((r) => ({
      entityId: String(r.id),
      email: r.user?.email?.trim() || "",
    }));
    const [caseloads, totals] = await Promise.all([
      fetchCaseManagerCaseloads(managers.map((m) => m.entityId)),
      fetchActiveCaseTotals(),
    ]);
    const rows = managers
      .map((m) => ({
        ...m,
        caseCount: caseloads[m.entityId] ?? 0,
      }))
      .sort((a, b) => b.caseCount - a.caseCount || Number(a.entityId) - Number(b.entityId));
    /** 唯一「已分配」案例数 = 活跃总数 − 未分配；勿用各经理行合计（共同负责会重复计数） */
    const assignedTotal = Math.max(0, totals.activeTotal - totals.unassignedCount);
    return NextResponse.json({
      rows,
      assignedTotal,
      unassignedCount: totals.unassignedCount,
      activeTotal: totals.activeTotal,
    });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
