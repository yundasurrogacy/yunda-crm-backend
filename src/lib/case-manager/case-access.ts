import { getClient } from "@/config-lib/graphql-client";
import {
  caseDetailWhere,
  type CaseDetailAccessMode,
} from "@/lib/case-manager/fetch-case-detail";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import { resolvePartyEntityId } from "@/lib/party/resolve-party-entity";
import type { CrmSession } from "@/types/portal";

const CASE_ACCESS_QUERY = `
  query CaseAccessCheck($where: cases_bool_exp!) {
    cases(where: $where, limit: 1) {
      id
      surrogate_mother_surrogate_mothers
    }
  }
`;

/** 轻量权限：案例是否对当前壳层可见（不拉档案/阶段全文）。 */
export async function canAccessCase(
  session: CrmSession,
  caseIdRaw: string,
  mode: CaseDetailAccessMode,
): Promise<boolean> {
  if (!/^\d+$/u.test(caseIdRaw)) return false;

  let partyEntityId: string | null = null;
  let cmId: string | null = null;
  if (mode === "case_manager_api") {
    cmId = await resolveCaseManagerEntityId(session);
  }
  if (mode === "intended_parent_api" || mode === "surrogate_mother_api") {
    partyEntityId = await resolvePartyEntityId(
      mode === "intended_parent_api" ? "intended_parent" : "surrogate_mother",
      session.userId,
    );
    if (!partyEntityId) return false;
  }

  const where = caseDetailWhere(BigInt(caseIdRaw), mode, cmId, session.userId, partyEntityId);
  const client = getClient();
  const data = await client.execute<{ cases: { id: string | number }[] }>({
    query: `query CaseAccessId($where: cases_bool_exp!) { cases(where: $where, limit: 1) { id } }`,
    variables: { where },
  });
  return Boolean(data.cases?.[0]);
}

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
