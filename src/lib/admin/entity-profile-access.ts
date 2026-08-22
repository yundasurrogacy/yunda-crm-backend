import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import type { EntityKind } from "@/lib/admin/entity-profile";
import { caseManagerAccessOrClauses } from "@/lib/case-manager/case-manager-access";
import { readCreatedByCmId } from "@/lib/party/create-party-entity";
import type { CrmSession } from "@/types/portal";
import { getClient } from "@/config-lib/graphql-client";

const PARTY_ACCESS_QUERY = `
  query CmPartyAccess($where: cases_bool_exp!) {
    cases(where: $where, limit: 1) {
      id
    }
  }
`;

const IP_META_QUERY = `
  query CmIpMeta($id: bigint!) {
    intended_parents_by_pk(id: $id) { id profile_data }
  }
`;

const SM_META_QUERY = `
  query CmSmMeta($id: bigint!) {
    surrogate_mothers_by_pk(id: $id) { id profile_data }
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

  const accessOr = caseManagerAccessOrClauses(resolvedCaseManagerEntityId, sessionUserId);
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
  if ((data.cases?.length ?? 0) > 0) return true;

  // 自己建档、尚未绑到案例的主体
  if (!cmId) return false;
  if (kind === "intended_parent") {
    const row = await client.execute<{
      intended_parents_by_pk: { profile_data: unknown } | null;
    }>({ query: IP_META_QUERY, variables: { id: entityIdRaw } });
    return readCreatedByCmId(row.intended_parents_by_pk?.profile_data) === cmId;
  }
  const row = await client.execute<{
    surrogate_mothers_by_pk: { profile_data: unknown } | null;
  }>({ query: SM_META_QUERY, variables: { id: entityIdRaw } });
  return readCreatedByCmId(row.surrogate_mothers_by_pk?.profile_data) === cmId;
}
