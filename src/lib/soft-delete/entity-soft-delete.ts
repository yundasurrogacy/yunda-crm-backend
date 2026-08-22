import { getClient } from "@/config-lib/graphql-client";

export type SoftDeleteEntityKind = "case_manager" | "intended_parent" | "surrogate_mother";

const ACTIVE = { deleted_at: { _is_null: true } } as const;

/** GraphQL where fragment: only non-soft-deleted rows */
export function notSoftDeletedWhere(): { deleted_at: { _is_null: true } } {
  return { ...ACTIVE };
}

export function mergeActiveWhere(
  extra?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!extra || Object.keys(extra).length === 0) return { ...ACTIVE };
  return { _and: [ACTIVE, extra] };
}

const MUTATIONS: Record<SoftDeleteEntityKind, string> = {
  case_manager: `
    mutation SoftDeleteCaseManager($id: bigint!, $deleted_at: timestamptz) {
      update_case_managers_by_pk(pk_columns: { id: $id }, _set: { deleted_at: $deleted_at }) {
        id
        deleted_at
      }
    }
  `,
  intended_parent: `
    mutation SoftDeleteIntendedParent($id: bigint!, $deleted_at: timestamptz) {
      update_intended_parents_by_pk(pk_columns: { id: $id }, _set: { deleted_at: $deleted_at }) {
        id
        deleted_at
      }
    }
  `,
  surrogate_mother: `
    mutation SoftDeleteSurrogate($id: bigint!, $deleted_at: timestamptz) {
      update_surrogate_mothers_by_pk(pk_columns: { id: $id }, _set: { deleted_at: $deleted_at }) {
        id
        deleted_at
      }
    }
  `,
};

const GET_ONE: Record<SoftDeleteEntityKind, string> = {
  case_manager: `
    query GetCmDeleted($id: bigint!) {
      case_managers_by_pk(id: $id) { id deleted_at }
    }
  `,
  intended_parent: `
    query GetIpDeleted($id: bigint!) {
      intended_parents_by_pk(id: $id) { id deleted_at }
    }
  `,
  surrogate_mother: `
    query GetSmDeleted($id: bigint!) {
      surrogate_mothers_by_pk(id: $id) { id deleted_at }
    }
  `,
};

type PkRow = { id: string | number; deleted_at: string | null };

function pkKey(kind: SoftDeleteEntityKind): string {
  if (kind === "case_manager") return "case_managers_by_pk";
  if (kind === "intended_parent") return "intended_parents_by_pk";
  return "surrogate_mothers_by_pk";
}

function updateKey(kind: SoftDeleteEntityKind): string {
  if (kind === "case_manager") return "update_case_managers_by_pk";
  if (kind === "intended_parent") return "update_intended_parents_by_pk";
  return "update_surrogate_mothers_by_pk";
}

export async function getEntityDeletedAt(
  kind: SoftDeleteEntityKind,
  idRaw: string,
): Promise<{ id: string; deleted_at: string | null } | null> {
  if (!/^\d+$/u.test(idRaw)) return null;
  const client = getClient();
  const data = await client.execute<Record<string, PkRow | null>>({
    query: GET_ONE[kind],
    variables: { id: idRaw },
  });
  const row = data[pkKey(kind)];
  if (!row) return null;
  return { id: String(row.id), deleted_at: row.deleted_at ?? null };
}

export async function setEntitySoftDeleted(
  kind: SoftDeleteEntityKind,
  idRaw: string,
  deleted: boolean,
): Promise<{ ok: true; deleted_at: string | null } | { ok: false; error: "not_found" | "update_failed" }> {
  if (!/^\d+$/u.test(idRaw)) return { ok: false, error: "not_found" };
  const deleted_at = deleted ? new Date().toISOString() : null;
  try {
    const client = getClient();
    const data = await client.execute<Record<string, PkRow | null>>({
      query: MUTATIONS[kind],
      variables: { id: idRaw, deleted_at },
    });
    const row = data[updateKey(kind)];
    if (!row) return { ok: false, error: "not_found" };
    return { ok: true, deleted_at: row.deleted_at ?? null };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}
