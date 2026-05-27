import { getClient } from "@/config-lib/graphql-client";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import type { EntityKind } from "@/lib/admin/entity-profile";
import type { CrmSession } from "@/types/portal";

const PARTY_ACCESS_QUERY = `
  query CmPartyAccess($where: cases_bool_exp!) {
    cases(where: $where, limit: 1) {
      id
    }
  }
`;

/** 案例经理仅可访问其负责/创建的案例所关联的 GC 或 IP */
export function caseManagerPartyAccessWhere(
  kind: EntityKind,
  entityId: string,
  resolvedCaseManagerEntityId: string | null,
  sessionUserId: string,
): Record<string, unknown> {
  const partyClause =
    kind === "intended_parent"
      ? { intended_parent_intended_parents: { _eq: entityId } }
      : { surrogate_mother_surrogate_mothers: { _eq: entityId } };

  const accessOr: Record<string, unknown>[] = [];
  const cmId = resolvedCaseManagerEntityId?.trim();
  const uid = sessionUserId?.trim();
  if (cmId) accessOr.push({ case_manager_case_managers: { _eq: cmId } });
  if (uid) {
    accessOr.push({ created_by: { _eq: uid } });
    accessOr.push({ case_manager: { user_users: { _eq: uid } } });
  }
  if (accessOr.length === 0) {
    return { _and: [partyClause, { id: { _eq: "0" } }] };
  }
  return { _and: [partyClause, { _or: accessOr }] };
}

export async function caseManagerCanAccessParty(
  session: CrmSession,
  kind: EntityKind,
  entityIdRaw: string,
): Promise<boolean> {
  if (!/^\d+$/u.test(entityIdRaw)) return false;
  if (!session.portals.includes("case_manager")) return false;

  const cmId = await resolveCaseManagerEntityId(session);
  const client = getClient();
  const data = await client.execute<{ cases: { id: string | number }[] }>({
    query: PARTY_ACCESS_QUERY,
    variables: {
      where: caseManagerPartyAccessWhere(kind, entityIdRaw, cmId, session.userId),
    },
  });
  return (data.cases?.length ?? 0) > 0;
}
