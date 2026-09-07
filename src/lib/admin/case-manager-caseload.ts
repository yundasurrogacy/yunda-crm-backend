import { getClient } from "@/config-lib/graphql-client";

const CASELOAD_QUERY = `
  query AdminCmCaseload($ids: [bigint!]!) {
    cases(
      where: {
        archived_at: { _is_null: true }
        _or: [
          { case_manager_case_managers: { _in: $ids } }
          { case_case_managers: { case_manager_case_managers: { _in: $ids } } }
        ]
      }
      limit: 5000
    ) {
      id
      case_manager_case_managers
      case_case_managers {
        case_manager_case_managers
      }
    }
  }
`;

const UNASSIGNED_COUNT_QUERY = `
  query AdminUnassignedCaseCount {
    cases_aggregate(
      where: {
        archived_at: { _is_null: true }
        case_manager_case_managers: { _is_null: true }
        _not: { case_case_managers: {} }
      }
    ) {
      aggregate { count }
    }
    cases_aggregate_all: cases_aggregate(where: { archived_at: { _is_null: true } }) {
      aggregate { count }
    }
  }
`;

/** 每位 CM 负责的活跃案例数（主 FK ∪ M2M，去重；不含软删案例）。 */
export async function fetchCaseManagerCaseloads(
  cmIds: string[],
): Promise<Record<string, number>> {
  const ids = [...new Set(cmIds.map((x) => x.trim()).filter((x) => /^\d+$/u.test(x)))];
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = 0;
  if (ids.length === 0) return out;

  const client = getClient();
  const data = await client.execute<{
    cases: {
      id: string | number;
      case_manager_case_managers: string | number | null;
      case_case_managers: { case_manager_case_managers: string | number }[] | null;
    }[];
  }>({
    query: CASELOAD_QUERY,
    variables: { ids },
  });

  const byCm = new Map<string, Set<string>>();
  for (const id of ids) byCm.set(id, new Set());

  for (const c of data.cases ?? []) {
    const caseId = String(c.id);
    const primary = c.case_manager_case_managers == null ? null : String(c.case_manager_case_managers);
    if (primary && byCm.has(primary)) byCm.get(primary)!.add(caseId);
    for (const link of c.case_case_managers ?? []) {
      const mid = String(link.case_manager_case_managers);
      if (byCm.has(mid)) byCm.get(mid)!.add(caseId);
    }
  }

  for (const [id, set] of byCm) out[id] = set.size;
  return out;
}

/** 未分配任何 CM（主 FK 与 M2M 皆空）的活跃案例数，以及活跃案例总数。 */
export async function fetchActiveCaseTotals(): Promise<{
  unassignedCount: number;
  activeTotal: number;
}> {
  const client = getClient();
  const data = await client.execute<{
    cases_aggregate: { aggregate: { count: number } | null };
    cases_aggregate_all: { aggregate: { count: number } | null };
  }>({ query: UNASSIGNED_COUNT_QUERY });
  return {
    unassignedCount: data.cases_aggregate?.aggregate?.count ?? 0,
    activeTotal: data.cases_aggregate_all?.aggregate?.count ?? 0,
  };
}

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

export type AdminCmWorkloadPayload = {
  rows: { entityId: string; email: string; caseCount: number }[];
  assignedTotal: number;
  unassignedCount: number;
  activeTotal: number;
};

export async function fetchAdminWorkloadPayload(): Promise<AdminCmWorkloadPayload> {
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
  const assignedTotal = Math.max(0, totals.activeTotal - totals.unassignedCount);
  return {
    rows,
    assignedTotal,
    unassignedCount: totals.unassignedCount,
    activeTotal: totals.activeTotal,
  };
}
