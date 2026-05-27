import { getClient } from "@/config-lib/graphql-client";
import { caseDetailWhere } from "@/lib/case-manager/fetch-case-detail";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import type { CrmSession } from "@/types/portal";

const CASE_ACCESS_QUERY = `
  query CaseAccessCheck($where: cases_bool_exp!) {
    cases(where: $where, limit: 1) {
      id
      surrogate_mother_surrogate_mothers
    }
  }
`;

/** 案例经理是否可访问该案例（负责 / 创建，与案例详情一致） */
export async function caseManagerCanAccessCase(
  session: CrmSession,
  caseIdRaw: string,
): Promise<{ allowed: boolean; hasSurrogate: boolean }> {
  if (!/^\d+$/u.test(caseIdRaw)) return { allowed: false, hasSurrogate: false };
  if (!session.portals.includes("case_manager")) return { allowed: false, hasSurrogate: false };

  const cmId = await resolveCaseManagerEntityId(session);
  const client = getClient();
  const where = caseDetailWhere(BigInt(caseIdRaw), "case_manager_api", cmId, session.userId);
  const data = await client.execute<{
    cases: { id: string | number; surrogate_mother_surrogate_mothers: string | number | null }[];
  }>({
    query: CASE_ACCESS_QUERY,
    variables: { where },
  });
  const row = data.cases?.[0];
  if (!row) return { allowed: false, hasSurrogate: false };
  return {
    allowed: true,
    hasSurrogate: row.surrogate_mother_surrogate_mothers != null,
  };
}
