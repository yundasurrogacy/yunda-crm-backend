import { getClient } from "@/config-lib/graphql-client";

const INSERT_LINK = `
  mutation UpsertCaseCmLink($caseId: bigint!, $cmId: bigint!) {
    insert_case_case_managers_one(
      object: { case_cases: $caseId, case_manager_case_managers: $cmId }
      on_conflict: {
        constraint: case_case_managers_case_cases_case_manager_case_managers_key
        update_columns: []
      }
    ) {
      id
    }
  }
`;

const SET_PRIMARY = `
  mutation SetPrimaryCaseManager($ids: [bigint!]!, $cmId: bigint!) {
    update_cases(
      where: { id: { _in: $ids } }
      _set: { case_manager_case_managers: $cmId }
    ) {
      affected_rows
    }
  }
`;

const CLEAR_PRIMARY = `
  mutation ClearPrimaryCaseManager($caseId: bigint!) {
    update_cases_by_pk(
      pk_columns: { id: $caseId }
      _set: { case_manager_case_managers: null }
    ) {
      id
    }
  }
`;

const DELETE_LINK = `
  mutation DeleteCaseCmLink($caseId: bigint!, $cmId: bigint!) {
    delete_case_case_managers(
      where: {
        case_cases: { _eq: $caseId }
        case_manager_case_managers: { _eq: $cmId }
      }
    ) {
      affected_rows
    }
  }
`;

const BULK_INSERT_LINKS = `
  mutation BulkInsertCaseCmLinks($objects: [case_case_managers_insert_input!]!) {
    insert_case_case_managers(
      objects: $objects
      on_conflict: {
        constraint: case_case_managers_case_cases_case_manager_case_managers_key
        update_columns: []
      }
    ) {
      affected_rows
    }
  }
`;

const LIST_FOR_CASE = `
  query ListCaseManagersForCase($caseId: bigint!) {
    cases_by_pk(id: $caseId) {
      id
      case_manager_case_managers
      case_manager {
        id
        deleted_at
        user { email }
      }
      case_case_managers(order_by: { id: asc }) {
        id
        case_manager_case_managers
        case_manager {
          id
          deleted_at
          user { email }
        }
      }
    }
  }
`;

const CM_EXISTS = `
  query CaseManagerExistsActive($id: bigint!) {
    case_managers_by_pk(id: $id) {
      id
      deleted_at
    }
  }
`;

export type CaseManagerAssignment = {
  entityId: string;
  email: string;
  isPrimary: boolean;
  deleted: boolean;
};

/** 把 CM 加入案例 M2M（幂等） */
export async function linkCaseManagerToCase(caseId: string, cmId: string): Promise<void> {
  const client = getClient();
  await client.execute({
    query: INSERT_LINK,
    variables: { caseId, cmId },
  });
}

/** 设为主 CM，并确保写入 M2M */
export async function setPrimaryAndLinkCaseManagers(
  caseIds: string[],
  cmId: string,
): Promise<number> {
  if (caseIds.length === 0) return 0;
  const client = getClient();
  const updated = await client.execute<{
    update_cases: { affected_rows: number | null } | null;
  }>({
    query: SET_PRIMARY,
    variables: { ids: caseIds, cmId },
  });
  await client.execute({
    query: BULK_INSERT_LINKS,
    variables: {
      objects: caseIds.map((caseId) => ({
        case_cases: caseId,
        case_manager_case_managers: cmId,
      })),
    },
  });
  return updated.update_cases?.affected_rows ?? 0;
}

/** 从案例移除 CM：删 M2M；若是主负责则清空主 FK */
export async function unlinkCaseManagerFromCase(caseId: string, cmId: string): Promise<void> {
  const client = getClient();
  const current = await client.execute<{
    cases_by_pk: { case_manager_case_managers: string | number | null } | null;
  }>({
    query: `query PrimaryCm($caseId: bigint!) {
      cases_by_pk(id: $caseId) { case_manager_case_managers }
    }`,
    variables: { caseId },
  });
  const primary =
    current.cases_by_pk?.case_manager_case_managers == null
      ? null
      : String(current.cases_by_pk.case_manager_case_managers);
  await client.execute({
    query: DELETE_LINK,
    variables: { caseId, cmId },
  });
  if (primary === cmId) {
    await client.execute({
      query: CLEAR_PRIMARY,
      variables: { caseId },
    });
  }
}

export async function assertActiveCaseManager(cmId: string): Promise<boolean> {
  const client = getClient();
  const data = await client.execute<{
    case_managers_by_pk: { id: string | number; deleted_at: string | null } | null;
  }>({
    query: CM_EXISTS,
    variables: { id: cmId },
  });
  const row = data.case_managers_by_pk;
  return Boolean(row && row.deleted_at == null);
}

/** 列出案例的主负责 + 共同负责（去重；主负责即使未在 M2M 也会出现） */
export async function listCaseManagerAssignments(
  caseId: string,
): Promise<{ primaryId: string | null; managers: CaseManagerAssignment[] } | null> {
  const client = getClient();
  const data = await client.execute<{
    cases_by_pk: {
      id: string | number;
      case_manager_case_managers: string | number | null;
      case_manager: {
        id: string | number;
        deleted_at: string | null;
        user: { email: string | null } | null;
      } | null;
      case_case_managers: {
        id: string | number;
        case_manager_case_managers: string | number;
        case_manager: {
          id: string | number;
          deleted_at: string | null;
          user: { email: string | null } | null;
        } | null;
      }[];
    } | null;
  }>({
    query: LIST_FOR_CASE,
    variables: { caseId },
  });

  const row = data.cases_by_pk;
  if (!row) return null;

  const primaryId =
    row.case_manager_case_managers == null ? null : String(row.case_manager_case_managers);
  const byId = new Map<string, CaseManagerAssignment>();

  for (const link of row.case_case_managers ?? []) {
    const entityId = String(link.case_manager_case_managers);
    const cm = link.case_manager;
    byId.set(entityId, {
      entityId,
      email: cm?.user?.email?.trim() || "",
      isPrimary: primaryId === entityId,
      deleted: Boolean(cm?.deleted_at),
    });
  }

  if (primaryId && !byId.has(primaryId)) {
    const cm = row.case_manager;
    byId.set(primaryId, {
      entityId: primaryId,
      email: cm?.user?.email?.trim() || "",
      isPrimary: true,
      deleted: Boolean(cm?.deleted_at),
    });
  } else if (primaryId && byId.has(primaryId)) {
    byId.get(primaryId)!.isPrimary = true;
  }

  const managers = [...byId.values()].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return Number(a.entityId) - Number(b.entityId);
  });

  return { primaryId, managers };
}

/** 添加辅助案例经理（仅写 M2M，不改主负责）。 */
export async function addAuxiliaryCaseManager(caseId: string, cmId: string): Promise<void> {
  await linkCaseManagerToCase(caseId, cmId);
}

/** 读取当前主负责 ID（无则 null）。 */
export async function getPrimaryCaseManagerId(caseId: string): Promise<string | null> {
  const client = getClient();
  const current = await client.execute<{
    cases_by_pk: { case_manager_case_managers: string | number | null } | null;
  }>({
    query: `query PrimaryCm($caseId: bigint!) {
      cases_by_pk(id: $caseId) { case_manager_case_managers }
    }`,
    variables: { caseId },
  });
  const v = current.cases_by_pk?.case_manager_case_managers;
  return v == null ? null : String(v);
}
