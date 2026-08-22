import { getClient } from "@/config-lib/graphql-client";

const INSERT_GC_HISTORY = `
  mutation InsertCaseGcHistory(
    $caseId: bigint!
    $fromId: bigint
    $toId: bigint
    $byRole: String
    $byEntityId: bigint
    $byLabel: String
    $remark: String
  ) {
    insert_case_gc_history_one(
      object: {
        case_cases: $caseId
        from_surrogate_mother: $fromId
        to_surrogate_mother: $toId
        changed_by_role: $byRole
        changed_by_entity_id: $byEntityId
        changed_by_label: $byLabel
        remark: $remark
      }
    ) {
      id
    }
  }
`;

const LIST_GC_HISTORY = `
  query ListCaseGcHistory($caseId: bigint!) {
    case_gc_history(
      where: { case_cases: { _eq: $caseId } }
      order_by: { created_at: desc }
      limit: 50
    ) {
      id
      from_surrogate_mother
      to_surrogate_mother
      changed_by_role
      changed_by_entity_id
      changed_by_label
      remark
      created_at
    }
  }
`;

export type CaseGcHistoryRow = {
  id: string;
  from_surrogate_mother: string | null;
  to_surrogate_mother: string | null;
  changed_by_role: string | null;
  changed_by_entity_id: string | null;
  changed_by_label: string | null;
  remark: string | null;
  created_at: string;
};

export async function insertCaseGcHistory(input: {
  caseId: string;
  fromId: string | null;
  toId: string | null;
  byRole: string | null;
  byEntityId: string | null;
  byLabel: string | null;
  remark?: string;
}): Promise<void> {
  const client = getClient();
  await client.execute({
    query: INSERT_GC_HISTORY,
    variables: {
      caseId: input.caseId,
      fromId: input.fromId,
      toId: input.toId,
      byRole: input.byRole,
      byEntityId: input.byEntityId,
      byLabel: input.byLabel,
      remark: input.remark ?? null,
    },
  });
}

export async function listCaseGcHistory(caseId: string): Promise<CaseGcHistoryRow[]> {
  if (!/^\d+$/u.test(caseId)) return [];
  const client = getClient();
  const data = await client.execute<{
    case_gc_history: {
      id: string | number;
      from_surrogate_mother: string | number | null;
      to_surrogate_mother: string | number | null;
      changed_by_role: string | null;
      changed_by_entity_id: string | number | null;
      changed_by_label: string | null;
      remark: string | null;
      created_at: string;
    }[];
  }>({
    query: LIST_GC_HISTORY,
    variables: { caseId },
  });
  return (data.case_gc_history ?? []).map((r) => ({
    id: String(r.id),
    from_surrogate_mother: r.from_surrogate_mother == null ? null : String(r.from_surrogate_mother),
    to_surrogate_mother: r.to_surrogate_mother == null ? null : String(r.to_surrogate_mother),
    changed_by_role: r.changed_by_role,
    changed_by_entity_id: r.changed_by_entity_id == null ? null : String(r.changed_by_entity_id),
    changed_by_label: r.changed_by_label,
    remark: r.remark,
    created_at: r.created_at,
  }));
}
