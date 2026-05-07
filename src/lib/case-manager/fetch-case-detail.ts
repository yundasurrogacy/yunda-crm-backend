import { getClient } from "@/config-lib/graphql-client";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
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
      surrogate_mother {
        email
        contact_information
      }
      intended_parent {
        email
        contact_information
        basic_information
        family_profile
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

export type CaseDetailAccessMode = "case_manager_api" | "admin_api";

/** 详情查询：管理端用 admin_api（仅按 id）；案例经理端用 case_manager_api（id + 当前用户在业务表上的案例经理行）。 */
export function caseDetailWhere(
  caseIdNumeric: bigint,
  mode: CaseDetailAccessMode,
  resolvedCaseManagerEntityId: string | null | undefined,
): Record<string, unknown> {
  const idClause = { id: { _eq: String(caseIdNumeric) } };
  if (mode === "admin_api") {
    return idClause;
  }
  const cmId = resolvedCaseManagerEntityId?.trim();
  if (!cmId) {
    return { _and: [idClause, { id: { _eq: "0" } }] };
  }
  return {
    _and: [idClause, { case_manager_case_managers: { _eq: cmId } }],
  };
}

export type AmCaseDetail = {
  id: string;
  process_status: string | null;
  trust_account_balance: string;
  created_at: string;
  updated_at: string;
  surrogate: { displayName: string; email: string | null; contact_information: unknown | null };
  intended_parent: {
    displayName: string;
    email: string | null;
    basic_information: unknown | null;
    family_profile: unknown | null;
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
  if (options.mode === "case_manager_api" && !resolvedCmId) {
    return null;
  }

  const client = getClient();
  const where = caseDetailWhere(idNum, options.mode, resolvedCmId);

  const data = await client.execute<{
    cases: {
      id: string | number;
      process_status: string | null;
      trust_account_balance: string | number;
      created_at: string;
      updated_at: string;
      data: unknown;
      surrogate_mother: {
        email: string;
        contact_information: unknown;
      } | null;
      intended_parent: {
        email: string;
        contact_information: unknown;
        basic_information: unknown;
        family_profile: unknown;
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

  const stageData = workspaceFromCaseData(row.data);
  const process_status = resolveProcessStatusForWorkflow(row.process_status);

  return {
    id: String(row.id),
    process_status,
    trust_account_balance: trust,
    created_at: row.created_at,
    updated_at: row.updated_at,
    surrogate: {
      displayName: surrogateDisplayName(sm?.contact_information) || sm?.email?.trim() || "",
      email: sm?.email?.trim() || null,
      contact_information: sm?.contact_information ?? null,
    },
    intended_parent: {
      displayName: intendedParentDisplay(ip?.contact_information, ip?.email) || "",
      email: ip?.email?.trim() || null,
      basic_information: ip?.basic_information ?? null,
      family_profile: ip?.family_profile ?? null,
    },
    case_manager: cm?.email ? { email: cm.email, user_id: String(cm.id) } : null,
    stage_data: stageData,
  };
}
