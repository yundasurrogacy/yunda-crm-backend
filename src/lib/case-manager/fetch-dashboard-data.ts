import { getClient } from "@/config-lib/graphql-client";
import type { CrmSession } from "@/types/portal";
import { CANONICAL_CASE_STAGES, type CanonicalCaseStage } from "@/constants/case-stages";
import { intendedParentDisplay, surrogateDisplayName } from "@/lib/case-manager/display-names";
import { resolveProcessStatusForWorkflow } from "@/lib/case-manager/process-status";

const CASES_LIST_QUERY = `
  query AmDashboardCases(
    $where: cases_bool_exp!
    $limit: Int!
    $offset: Int!
  ) {
    cases_aggregate(where: $where) {
      aggregate {
        count
      }
    }
    cases(
      where: $where
      order_by: [{ updated_at: desc_nulls_last }, { id: desc }]
      limit: $limit
      offset: $offset
    ) {
      id
      process_status
      updated_at
      case_manager_case_managers
      intended_parent_intended_parents
      surrogate_mother_surrogate_mothers
      case_manager {
        user {
          email
        }
      }
      surrogate_mother {
        contact_information
        email
      }
      intended_parent {
        contact_information
        email
      }
    }
  }
`;

const COUNT_FRAGMENT = `
  query AmStageCount($where: cases_bool_exp!) {
    cases_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export type AmCaseRow = {
  id: string;
  process_status: string | null;
  updated_at: string | null;
  caseManagerId: string | null;
  caseManagerEmail: string | null;
  intendedParentId: string | null;
  surrogateId: string | null;
  surrogateName: string;
  intendedParentName: string;
};

export type CasesQueryFilters = {
  stage?: CanonicalCaseStage | "all";
  q?: string;
  processStatus?: string;
  caseManagerId?: string;
  intendedParentId?: string;
  surrogateId?: string;
};

/** 案例经理端 API 固定用 `case_manager_assigned`；管理端列表用 `admin_all`。 */
export type CasesListScope = "case_manager_assigned" | "admin_all";

const RESOLVE_CM_FOR_USER = `
  query ResolveCaseManagerEntityForUser($uid: bigint!) {
    case_managers(where: { user_users: { _eq: $uid } }, limit: 1) {
      id
    }
  }
`;

/** 当前登录用户在 `case_managers` 表中的业务 ID（用于列表 / 统计精确限定负责案例）。 */
export async function resolveCaseManagerEntityId(session: CrmSession): Promise<string | null> {
  const client = getClient();
  const data = await client.execute<{ case_managers: { id: string | number }[] }>({
    query: RESOLVE_CM_FOR_USER,
    variables: { uid: session.userId },
  });
  const id = data.case_managers?.[0]?.id;
  return id == null ? null : String(id);
}

function scopeClauseForList(
  scope: CasesListScope,
  resolvedCaseManagerEntityId: string | null | undefined,
): Record<string, unknown> {
  if (scope === "admin_all") {
    return {};
  }
  const cmId = resolvedCaseManagerEntityId?.trim();
  if (!cmId) {
    return { id: { _eq: "0" } };
  }
  return { case_manager_case_managers: { _eq: cmId } };
}

function cleanId(input?: string): string | null {
  if (!input) return null;
  const s = input.trim();
  return /^\d+$/u.test(s) ? s : null;
}

function buildQueryClauses(filters: CasesQueryFilters): Record<string, unknown>[] {
  const clauses: Record<string, unknown>[] = [];
  /** 管道阶段唯一来源：`cases.process_status`（canonical stage key）。卡片筛选传 `stage`，「我的案例」可额外传 `processStatus`，二者勿叠加以免 AND 出矛盾条件。 */
  if (filters.stage && filters.stage !== "all") {
    clauses.push({ process_status: { _eq: filters.stage } });
  } else if (filters.processStatus?.trim()) {
    clauses.push({ process_status: { _eq: filters.processStatus.trim() } });
  }
  const caseManagerId = cleanId(filters.caseManagerId);
  if (caseManagerId) {
    clauses.push({ case_manager_case_managers: { _eq: caseManagerId } });
  }
  const intendedParentId = cleanId(filters.intendedParentId);
  if (intendedParentId) {
    clauses.push({ intended_parent_intended_parents: { _eq: intendedParentId } });
  }
  const surrogateId = cleanId(filters.surrogateId);
  if (surrogateId) {
    clauses.push({ surrogate_mother_surrogate_mothers: { _eq: surrogateId } });
  }
  const q = filters.q?.trim();
  if (q) {
    const or: Record<string, unknown>[] = [
      { intended_parent: { email: { _ilike: `%${q}%` } } },
      { surrogate_mother: { email: { _ilike: `%${q}%` } } },
      { case_manager: { user: { email: { _ilike: `%${q}%` } } } },
    ];
    const qId = cleanId(q);
    if (qId) {
      or.push({ id: { _eq: qId } });
      or.push({ case_manager_case_managers: { _eq: qId } });
      or.push({ intended_parent_intended_parents: { _eq: qId } });
      or.push({ surrogate_mother_surrogate_mothers: { _eq: qId } });
    }
    clauses.push({ _or: or });
  }
  return clauses;
}

export function buildCasesWhere(
  filters: CasesQueryFilters,
  listScope: CasesListScope,
  resolvedCaseManagerEntityId?: string | null,
): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [];
  const scope = scopeClauseForList(listScope, resolvedCaseManagerEntityId);
  if (Object.keys(scope).length > 0) {
    clauses.push(scope);
  }
  clauses.push(...buildQueryClauses(filters));
  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0]!;
  return { _and: clauses };
}

export async function fetchStageCounts(
  session: CrmSession,
  listScope: CasesListScope,
  resolvedCaseManagerEntityId?: string | null,
): Promise<Record<CanonicalCaseStage, number>> {
  const client = getClient();
  const entries = await Promise.all(
    CANONICAL_CASE_STAGES.map(async (stage) => {
      const where = buildCasesWhere({ stage }, listScope, resolvedCaseManagerEntityId);
      const data = await client.execute<{
        cases_aggregate: { aggregate: { count: number } | null };
      }>({
        query: COUNT_FRAGMENT,
        variables: { where },
      });
      const n = data.cases_aggregate?.aggregate?.count ?? 0;
      return [stage, n] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<CanonicalCaseStage, number>;
}

/** `all`：不按阶段筛选，文档「我的案例」——当前账号下有权限的全部负责案例 */
export async function fetchCasesPage(
  session: CrmSession,
  stage: CanonicalCaseStage | "all",
  page: number,
  pageSize: number,
  filters: Omit<CasesQueryFilters, "stage"> | undefined,
  listScope: CasesListScope,
  resolvedCaseManagerEntityId?: string | null,
): Promise<{ rows: AmCaseRow[]; total: number }> {
  const client = getClient();
  const where = buildCasesWhere({ stage, ...filters }, listScope, resolvedCaseManagerEntityId);
  const limit = Math.min(Math.max(pageSize, 1), 100);
  const offset = Math.max(page - 1, 0) * limit;

  const data = await client.execute<{
    cases_aggregate: { aggregate: { count: number } | null };
    cases: {
      id: string | number;
      process_status: string | null;
      updated_at: string | null;
      case_manager_case_managers: string | number | null;
      intended_parent_intended_parents: string | number | null;
      surrogate_mother_surrogate_mothers: string | number | null;
      case_manager: {
        user: {
          email: string | null;
        } | null;
      } | null;
      surrogate_mother: {
        contact_information: unknown;
        email: string | null;
      } | null;
      intended_parent: {
        contact_information: unknown;
        email: string | null;
      } | null;
    }[];
  }>({
    query: CASES_LIST_QUERY,
    variables: { where, limit, offset },
  });

  const total = data.cases_aggregate?.aggregate?.count ?? 0;

  const rows: AmCaseRow[] = (data.cases ?? []).map((c) => ({
    id: String(c.id),
    process_status: resolveProcessStatusForWorkflow(c.process_status),
    updated_at: c.updated_at ?? null,
    caseManagerId: c.case_manager_case_managers == null ? null : String(c.case_manager_case_managers),
    caseManagerEmail: c.case_manager?.user?.email?.trim() || null,
    intendedParentId:
      c.intended_parent_intended_parents == null ? null : String(c.intended_parent_intended_parents),
    surrogateId:
      c.surrogate_mother_surrogate_mothers == null ? null : String(c.surrogate_mother_surrogate_mothers),
    surrogateName:
      surrogateDisplayName(c.surrogate_mother?.contact_information) ||
      c.surrogate_mother?.email?.trim() ||
      "—",
    intendedParentName:
      intendedParentDisplay(c.intended_parent?.contact_information, c.intended_parent?.email ?? undefined) || "—",
  }));

  return { rows, total };
}
