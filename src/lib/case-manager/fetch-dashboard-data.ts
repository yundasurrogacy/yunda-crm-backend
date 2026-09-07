import { getClient } from "@/config-lib/graphql-client";
import type { CrmSession } from "@/types/portal";
import {
  CANONICAL_CASE_STAGES,
  canonicalStageQueryValues,
  normalizeCanonicalCaseStage,
  type CanonicalCaseStage,
} from "@/constants/case-stages";
import { intendedParentDisplay, surrogateDisplayName } from "@/lib/case-manager/display-names";
import { resolveProcessStatusForWorkflow } from "@/lib/case-manager/process-status";
import {
  caseManagerAccessOrClauses,
  caseManagerFilterClause,
} from "@/lib/case-manager/case-manager-access";

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
      archived_at
      created_by
      case_manager_case_managers
      intended_parent_intended_parents
      surrogate_mother_surrogate_mothers
      case_manager {
        user {
          email
        }
      }
      surrogate_mother {
        profile_data
        email
      }
      intended_parent {
        profile_data
        email
      }
    }
  }
`;

export type AmCaseRow = {
  id: string;
  process_status: string | null;
  updated_at: string | null;
  archived_at: string | null;
  createdByUserId: string | null;
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
  /** 默认 false：列表排除已软归档案例 */
  includeArchived?: boolean;
};

/** 案例经理端 API：全部（创建∪负责）/ 我负责 / 我创建；管理端列表用 `admin_all`。 */
export type CasesListScope =
  | "case_manager_all"
  | "case_manager_assigned"
  | "case_manager_created"
  | "admin_all";

const RESOLVE_CM_FOR_USER = `
  query ResolveCaseManagerEntityForUser($uid: bigint!) {
    case_managers(
      where: { user_users: { _eq: $uid }, deleted_at: { _is_null: true } }
      limit: 1
    ) {
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
  sessionUserId?: string,
): Record<string, unknown> {
  if (scope === "admin_all") {
    return {};
  }
  if (scope === "case_manager_created") {
    const uid = sessionUserId?.trim();
    if (!uid) return { id: { _eq: "0" } };
    return { created_by: { _eq: uid } };
  }
  if (scope === "case_manager_assigned") {
    const cmId = resolvedCaseManagerEntityId?.trim();
    if (!cmId) return { id: { _eq: "0" } };
    return caseManagerFilterClause(cmId);
  }
  /** case_manager_all：我创建的 ∪ 我负责的（主 FK 或 M2M） */
  const or = caseManagerAccessOrClauses(resolvedCaseManagerEntityId, sessionUserId);
  if (or.length === 0) return { id: { _eq: "0" } };
  return { _or: or };
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
    clauses.push({ process_status: { _in: canonicalStageQueryValues(filters.stage) } });
  } else if (filters.processStatus?.trim()) {
    const normalized = normalizeCanonicalCaseStage(filters.processStatus.trim());
    if (normalized) {
      clauses.push({ process_status: { _in: canonicalStageQueryValues(normalized) } });
    } else {
      clauses.push({ process_status: { _eq: filters.processStatus.trim() } });
    }
  }
  const cmRaw = filters.caseManagerId?.trim();
  if (cmRaw === "unassigned") {
    clauses.push({
      _and: [
        { case_manager_case_managers: { _is_null: true } },
        { _not: { case_case_managers: {} } },
      ],
    });
  } else {
    const caseManagerId = cleanId(cmRaw);
    if (caseManagerId) {
      clauses.push(caseManagerFilterClause(caseManagerId));
    }
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
      or.push(caseManagerFilterClause(qId));
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
  sessionUserId?: string,
): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [];
  const scope = scopeClauseForList(listScope, resolvedCaseManagerEntityId, sessionUserId);
  if (Object.keys(scope).length > 0) {
    clauses.push(scope);
  }
  clauses.push(...buildQueryClauses(filters));
  if (!filters.includeArchived) {
    clauses.push({ archived_at: { _is_null: true } });
  }
  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0]!;
  return { _and: clauses };
}

export async function fetchStageCounts(
  session: CrmSession,
  listScope: CasesListScope,
  resolvedCaseManagerEntityId?: string | null,
  includeArchived = false,
): Promise<Record<CanonicalCaseStage, number>> {
  const client = getClient();
  const variables: Record<string, unknown> = {};
  const defs: string[] = [];
  const fields: string[] = [];
  CANONICAL_CASE_STAGES.forEach((stage, i) => {
    variables[`w${i}`] = buildCasesWhere(
      { stage, includeArchived },
      listScope,
      resolvedCaseManagerEntityId,
      session.userId,
    );
    defs.push(`$w${i}: cases_bool_exp!`);
    fields.push(`c${i}: cases_aggregate(where: $w${i}) { aggregate { count } }`);
  });
  const data = await client.execute<Record<string, { aggregate: { count: number } | null }>>({
    query: `query AmStageCounts(${defs.join(", ")}) {\n${fields.join("\n")}\n}`,
    variables,
  });
  const out = {} as Record<CanonicalCaseStage, number>;
  CANONICAL_CASE_STAGES.forEach((stage, i) => {
    out[stage] = data[`c${i}`]?.aggregate?.count ?? 0;
  });
  return out;
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
  const where = buildCasesWhere(
    { stage, ...filters },
    listScope,
    resolvedCaseManagerEntityId,
    session.userId,
  );
  const limit = Math.min(Math.max(pageSize, 1), 100);
  const offset = Math.max(page - 1, 0) * limit;

  const data = await client.execute<{
    cases_aggregate: { aggregate: { count: number } | null };
    cases: {
      id: string | number;
      process_status: string | null;
      updated_at: string | null;
      archived_at: string | null;
      created_by: string | number | null;
      case_manager_case_managers: string | number | null;
      intended_parent_intended_parents: string | number | null;
      surrogate_mother_surrogate_mothers: string | number | null;
      case_manager: {
        user: {
          email: string | null;
        } | null;
      } | null;
      surrogate_mother: {
        profile_data: unknown;
        email: string | null;
      } | null;
      intended_parent: {
        profile_data: unknown;
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
    archived_at: c.archived_at ?? null,
    createdByUserId: c.created_by == null ? null : String(c.created_by),
    caseManagerId: c.case_manager_case_managers == null ? null : String(c.case_manager_case_managers),
    caseManagerEmail: c.case_manager?.user?.email?.trim() || null,
    intendedParentId:
      c.intended_parent_intended_parents == null ? null : String(c.intended_parent_intended_parents),
    surrogateId:
      c.surrogate_mother_surrogate_mothers == null ? null : String(c.surrogate_mother_surrogate_mothers),
    surrogateName:
      surrogateDisplayName(c.surrogate_mother?.profile_data, c.surrogate_mother?.email ?? undefined) || "—",
    intendedParentName:
      intendedParentDisplay(c.intended_parent?.profile_data, c.intended_parent?.email ?? undefined) || "—",
  }));

  return { rows, total };
}
