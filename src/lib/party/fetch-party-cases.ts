import { getClient } from "@/config-lib/graphql-client";
import { intendedParentDisplay, surrogateDisplayName } from "@/lib/case-manager/display-names";
import { resolveProcessStatusForWorkflow } from "@/lib/case-manager/process-status";
import type { PartyKind } from "@/lib/party/resolve-party-entity";

const PARTY_CASES_QUERY = `
  query PartyCases($where: cases_bool_exp!) {
    cases(where: $where, order_by: [{ updated_at: desc_nulls_last }, { id: desc }], limit: 50) {
      id
      process_status
      updated_at
      created_at
      trust_account_balance
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

export type PartyCaseRow = {
  id: string;
  process_status: string | null;
  updated_at: string | null;
  created_at: string;
  trust_account_balance: string;
  caseManagerEmail: string | null;
  counterpartName: string;
};

export function partyCasesWhere(kind: PartyKind, entityId: string): Record<string, unknown> {
  const party =
    kind === "intended_parent"
      ? { intended_parent_intended_parents: { _eq: entityId } }
      : { surrogate_mother_surrogate_mothers: { _eq: entityId } };
  return { _and: [party, { archived_at: { _is_null: true } }] };
}

export async function fetchPartyCases(
  kind: PartyKind,
  entityId: string,
): Promise<PartyCaseRow[]> {
  const client = getClient();
  const data = await client.execute<{
    cases: {
      id: string | number;
      process_status: string | null;
      updated_at: string | null;
      created_at: string;
      trust_account_balance: string | number | null;
      case_manager: { user: { email: string | null } | null } | null;
      surrogate_mother: { profile_data: unknown; email: string | null } | null;
      intended_parent: { profile_data: unknown; email: string | null } | null;
    }[];
  }>({
    query: PARTY_CASES_QUERY,
    variables: { where: partyCasesWhere(kind, entityId) },
  });

  return (data.cases ?? []).map((c) => ({
    id: String(c.id),
    process_status: resolveProcessStatusForWorkflow(c.process_status),
    updated_at: c.updated_at ?? null,
    created_at: c.created_at,
    trust_account_balance:
      typeof c.trust_account_balance === "number"
        ? String(c.trust_account_balance)
        : (c.trust_account_balance ?? "0").toString(),
    caseManagerEmail: c.case_manager?.user?.email?.trim() || null,
    counterpartName:
      kind === "intended_parent"
        ? // IP 端默认不展示孕妈邮箱；无姓名时显示 —
          surrogateDisplayName(c.surrogate_mother?.profile_data) || "—"
        : intendedParentDisplay(c.intended_parent?.profile_data, c.intended_parent?.email ?? undefined) ||
          "—",
  }));
}

export async function partyCanAccessCase(
  kind: PartyKind,
  entityId: string,
  caseId: string,
): Promise<boolean> {
  if (!/^\d+$/u.test(caseId)) return false;
  const client = getClient();
  const data = await client.execute<{ cases: { id: string | number }[] }>({
    query: `query($where: cases_bool_exp!) { cases(where: $where, limit: 1) { id } }`,
    variables: {
      where: {
        _and: [{ id: { _eq: caseId } }, partyCasesWhere(kind, entityId)],
      },
    },
  });
  return (data.cases?.length ?? 0) > 0;
}
