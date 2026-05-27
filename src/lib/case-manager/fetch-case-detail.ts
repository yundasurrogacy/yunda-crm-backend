import { getClient } from "@/config-lib/graphql-client";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import { partyCasesWhere } from "@/lib/party/fetch-party-cases";
import { resolvePartyEntityId, type PartyKind } from "@/lib/party/resolve-party-entity";
import type { CrmSession } from "@/types/portal";
import type { AmWorkspacePayload } from "@/lib/case-manager/am-workspace-model";
import { workspaceFromCaseData } from "@/lib/case-manager/am-workspace-model";
import { resolveProcessStatusForWorkflow } from "@/lib/case-manager/process-status";
import { intendedParentDisplay, surrogateDisplayName } from "@/lib/case-manager/display-names";

const CASE_DETAIL_QUERY = `
  query AmCaseDetail($where: cases_bool_exp!) {
    cases(where: $where, limit: 1) {
      id
      process_status
      trust_account_balance
      created_at
      updated_at
      data
      surrogate_mother_surrogate_mothers
      intended_parent_intended_parents
      surrogate_mother {
        id
        email
        profile_data
      }
      intended_parent {
        id
        email
        profile_data
      }
      case_manager {
        user {
          id
          email
        }
      }
    }
  }
`;

export type CaseDetailAccessMode =
  | "case_manager_api"
  | "admin_api"
  | "intended_parent_api"
  | "surrogate_mother_api";

/** 详情查询：管理端 / 案例经理 / 准父母 / 代孕母 各自权限范围。 */
export function caseDetailWhere(
  caseIdNumeric: bigint,
  mode: CaseDetailAccessMode,
  resolvedCaseManagerEntityId: string | null | undefined,
  sessionUserId?: string,
  partyEntityId?: string | null,
): Record<string, unknown> {
  const idClause = { id: { _eq: String(caseIdNumeric) } };
  if (mode === "admin_api") {
    return idClause;
  }
  if (mode === "intended_parent_api" || mode === "surrogate_mother_api") {
    const entityId = partyEntityId?.trim();
    if (!entityId) return { _and: [idClause, { id: { _eq: "0" } }] };
    const kind: PartyKind = mode === "intended_parent_api" ? "intended_parent" : "surrogate_mother";
    return { _and: [idClause, partyCasesWhere(kind, entityId)] };
  }
  const cmId = resolvedCaseManagerEntityId?.trim();
  const uid = sessionUserId?.trim();
  if (!cmId && !uid) {
    return { _and: [idClause, { id: { _eq: "0" } }] };
  }
  const accessOr: Record<string, unknown>[] = [];
  if (cmId) accessOr.push({ case_manager_case_managers: { _eq: cmId } });
  if (uid) accessOr.push({ created_by: { _eq: uid } });
  return {
    _and: [idClause, { _or: accessOr }],
  };
}

export type AmCaseDetail = {
  id: string;
  process_status: string | null;
  trust_account_balance: string;
  created_at: string;
  updated_at: string;
  surrogate: {
    id: string | null;
    displayName: string;
    email: string | null;
    profile_data: unknown | null;
  };
  intended_parent: {
    id: string | null;
    displayName: string;
    email: string | null;
    profile_data: unknown | null;
  };
  case_manager: { email: string; user_id: string } | null;
  /** 各阶段表单；与 DB `cases.data` 根级的 `v`、`byStage` 一致 */
  stage_data: AmWorkspacePayload;
};

export async function fetchCaseDetail(
  session: CrmSession,
  caseIdRaw: string,
  options: { mode: CaseDetailAccessMode },
): Promise<AmCaseDetail | null> {
  const idNum = /^-?\d+$/.test(caseIdRaw) ? BigInt(caseIdRaw) : null;
  if (idNum === null || idNum < BigInt(1)) return null;

  const resolvedCmId =
    options.mode === "case_manager_api" ? await resolveCaseManagerEntityId(session) : null;

  let partyEntityId: string | null = null;
  if (options.mode === "intended_parent_api") {
    partyEntityId = await resolvePartyEntityId("intended_parent", session.userId);
    if (!partyEntityId) return null;
  } else if (options.mode === "surrogate_mother_api") {
    partyEntityId = await resolvePartyEntityId("surrogate_mother", session.userId);
    if (!partyEntityId) return null;
  }

  const client = getClient();
  const where = caseDetailWhere(
    idNum,
    options.mode,
    resolvedCmId,
    session.userId,
    partyEntityId,
  );

  const data = await client.execute<{
    cases: {
      id: string | number;
      process_status: string | null;
      trust_account_balance: string | number;
      created_at: string;
      updated_at: string;
      data: unknown;
      surrogate_mother_surrogate_mothers: string | number | null;
      intended_parent_intended_parents: string | number | null;
      surrogate_mother: {
        id: string | number;
        email: string;
        profile_data: unknown;
      } | null;
      intended_parent: {
        id: string | number;
        email: string;
        profile_data: unknown;
      } | null;
      case_manager: { user: { id: string | number; email: string } } | null;
    }[];
  }>({
    query: CASE_DETAIL_QUERY,
    variables: { where },
  });

  const row = data.cases?.[0];
  if (!row) return null;

  const sm = row.surrogate_mother;
  const ip = row.intended_parent;

  const trust =
    typeof row.trust_account_balance === "number"
      ? String(row.trust_account_balance)
      : (row.trust_account_balance ?? "0").toString();

  const cm = row.case_manager?.user;
  const smEmail = sm?.email?.trim() || null;
  const ipEmail = ip?.email?.trim() || null;

  const stageData = workspaceFromCaseData(row.data);
  const process_status = resolveProcessStatusForWorkflow(row.process_status);

  return {
    id: String(row.id),
    process_status,
    trust_account_balance: trust,
    created_at: row.created_at,
    updated_at: row.updated_at,
    surrogate: {
      id:
        sm?.id != null
          ? String(sm.id)
          : row.surrogate_mother_surrogate_mothers != null
            ? String(row.surrogate_mother_surrogate_mothers)
            : null,
      displayName: surrogateDisplayName(sm?.profile_data, smEmail ?? undefined),
      email: smEmail,
      profile_data: sm?.profile_data ?? null,
    },
    intended_parent: {
      id:
        ip?.id != null
          ? String(ip.id)
          : row.intended_parent_intended_parents != null
            ? String(row.intended_parent_intended_parents)
            : null,
      displayName: intendedParentDisplay(ip?.profile_data, ipEmail ?? undefined),
      email: ipEmail,
      profile_data: ip?.profile_data ?? null,
    },
    case_manager: cm?.email ? { email: cm.email, user_id: String(cm.id) } : null,
    stage_data: stageData,
  };
}
