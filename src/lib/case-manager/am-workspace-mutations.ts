import { getClient } from "@/config-lib/graphql-client";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import {
  caseDetailWhere,
  type CaseDetailAccessMode,
} from "@/lib/case-manager/fetch-case-detail";
import type { AmWorkspacePayload } from "@/lib/case-manager/am-workspace-model";
import type { CrmSession } from "@/types/portal";

type WriteMode = Extract<CaseDetailAccessMode, "case_manager_api" | "admin_api">;

const CASE_DATA_ROW = `
  query AmCaseDataRow($where: cases_bool_exp!) {
    cases(where: $where, limit: 1) {
      data
    }
  }
`;

const UPDATE_CASE_DATA = `
  mutation AmUpdateCaseDataJson($where: cases_bool_exp!, $data: json!) {
    update_cases(where: $where, _set: { data: $data }) {
      affected_rows
    }
  }
`;

const UPDATE_CASE_STATUS = `
  mutation AmUpdateCaseStatus($where: cases_bool_exp!, $process_status: String!) {
    update_cases(where: $where, _set: { process_status: $process_status }) {
      affected_rows
    }
  }
`;

async function scopedCaseWhere(
  session: CrmSession,
  caseIdNumeric: bigint,
  mode: WriteMode,
) {
  if (mode === "admin_api") {
    return caseDetailWhere(caseIdNumeric, "admin_api", null);
  }
  const cmId = await resolveCaseManagerEntityId(session);
  return caseDetailWhere(caseIdNumeric, "case_manager_api", cmId, session.userId);
}

/** 将各阶段表单写入 `cases.data` 根级的 `v`、`byStage`，合并保留同字段其它键 */
export async function persistCaseDataWorkspace(
  session: CrmSession,
  caseIdNumeric: bigint,
  workspace: AmWorkspacePayload,
  mode: WriteMode = "case_manager_api",
): Promise<void> {
  const client = getClient();
  const where = await scopedCaseWhere(session, caseIdNumeric, mode);
  const existing = await client.execute<{ cases: { data: unknown }[] }>({
    query: CASE_DATA_ROW,
    variables: { where },
  });
  const prev = existing.cases?.[0]?.data;
  const base: Record<string, unknown> =
    prev && typeof prev === "object" && !Array.isArray(prev)
      ? { ...(prev as Record<string, unknown>) }
      : {};
  base.v = workspace.v;
  base.byStage = workspace.byStage as unknown;
  const data = await client.execute<{ update_cases: { affected_rows: number | null } | null }>({
    query: UPDATE_CASE_DATA,
    variables: { where, data: base },
  });
  const n = data.update_cases?.affected_rows ?? 0;
  if (n < 1) throw new Error("case_data_update_forbidden");
}

export async function updateCaseProcessStatus(
  session: CrmSession,
  caseIdNumeric: bigint,
  processStatus: string,
  mode: WriteMode = "case_manager_api",
): Promise<void> {
  const client = getClient();
  const where = await scopedCaseWhere(session, caseIdNumeric, mode);
  const data = await client.execute<{ update_cases: { affected_rows: number | null } | null }>({
    query: UPDATE_CASE_STATUS,
    variables: { where, process_status: processStatus },
  });
  const n = data.update_cases?.affected_rows ?? 0;
  if (n < 1) throw new Error("case_update_forbidden");
}
