import { getClient } from "@/config-lib/graphql-client";
import type { CrmSession } from "@/types/portal";
import { intendedParentDisplay, surrogateDisplayName } from "@/lib/case-manager/display-names";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import { caseManagerAccessOrClauses } from "@/lib/case-manager/case-manager-access";

const OPTIONS_QUERY = `
  query CmCaseOptions($cmWhere: case_managers_bool_exp!, $partyWhere: cases_bool_exp!) {
    case_managers(where: $cmWhere, limit: 1) {
      id
      user { email }
    }
    intended_parents(
      where: { _and: [{ deleted_at: { _is_null: true } }, { cases: $partyWhere }] }
      order_by: { id: asc }
      limit: 500
    ) {
      id
      email
      profile_data
    }
    surrogate_mothers(
      where: { _and: [{ deleted_at: { _is_null: true } }, { cases: $partyWhere }] }
      order_by: { id: asc }
      limit: 500
    ) {
      id
      email
      profile_data
    }
  }
`;

export type CmFilterOptions = {
  caseManagers: { id: string; label: string }[];
  intendedParents: { id: string; label: string }[];
  surrogates: { id: string; label: string }[];
};

export async function fetchCmFilterOptions(
  session: CrmSession,
  resolvedCmId?: string | null,
): Promise<CmFilterOptions> {
  const cmId = resolvedCmId === undefined ? await resolveCaseManagerEntityId(session) : resolvedCmId;
  const accessOr = caseManagerAccessOrClauses(cmId, session.userId);
  const partyWhere = accessOr.length > 0 ? { _or: accessOr } : { id: { _eq: "0" } };
  const cmWhere = {
    _and: [{ user_users: { _eq: session.userId } }, { deleted_at: { _is_null: true } }],
  };

  const client = getClient();
  const data = await client.execute<{
    case_managers: { id: string | number; user: { email: string | null } | null }[];
    intended_parents: { id: string | number; email: string | null; profile_data: unknown }[];
    surrogate_mothers: { id: string | number; email: string | null; profile_data: unknown }[];
  }>({
    query: OPTIONS_QUERY,
    variables: { cmWhere, partyWhere },
  });

  const cm = data.case_managers?.[0];
  return {
    caseManagers: cm
      ? [
          {
            id: String(cm.id),
            label: `${cm.user?.email?.trim() || "—"} (#${cm.id})`,
          },
        ]
      : [],
    intendedParents: (data.intended_parents ?? []).map((r) => ({
      id: String(r.id),
      label: `${intendedParentDisplay(r.profile_data, r.email ?? undefined) || "—"} (#${r.id})`,
    })),
    surrogates: (data.surrogate_mothers ?? []).map((r) => ({
      id: String(r.id),
      label: `${surrogateDisplayName(r.profile_data, r.email ?? undefined) || "—"} (#${r.id})`,
    })),
  };
}
