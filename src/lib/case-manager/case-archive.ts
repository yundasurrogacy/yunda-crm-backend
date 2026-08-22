import { getClient } from "@/config-lib/graphql-client";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import {
  caseDetailWhere,
  type CaseDetailAccessMode,
} from "@/lib/case-manager/fetch-case-detail";
import type { CrmSession } from "@/types/portal";

type WriteMode = Extract<CaseDetailAccessMode, "case_manager_api" | "admin_api">;

const ARCHIVE_MUTATION = `
  mutation SoftArchiveCase($where: cases_bool_exp!, $archived_at: timestamptz) {
    update_cases(where: $where, _set: { archived_at: $archived_at }) {
      affected_rows
    }
  }
`;

async function scopedWhere(session: CrmSession, caseId: bigint, mode: WriteMode) {
  if (mode === "admin_api") return caseDetailWhere(caseId, "admin_api", null);
  const cmId = await resolveCaseManagerEntityId(session);
  return caseDetailWhere(caseId, "case_manager_api", cmId, session.userId);
}

export async function setCaseArchived(
  session: CrmSession,
  caseIdRaw: string,
  mode: WriteMode,
  archived: boolean,
): Promise<{ ok: true } | { ok: false; error: "not_found" | "update_failed" }> {
  if (!/^\d+$/u.test(caseIdRaw)) return { ok: false, error: "not_found" };
  const where = await scopedWhere(session, BigInt(caseIdRaw), mode);
  try {
    const client = getClient();
    const res = await client.execute<{ update_cases: { affected_rows: number | null } | null }>({
      query: ARCHIVE_MUTATION,
      variables: {
        where,
        archived_at: archived ? new Date().toISOString() : null,
      },
    });
    if ((res.update_cases?.affected_rows ?? 0) < 1) return { ok: false, error: "not_found" };
    return { ok: true };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}
