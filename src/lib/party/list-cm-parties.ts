import { getClient } from "@/config-lib/graphql-client";
import { DEFAULT_RECORD_FILTER, type RecordFilter } from "@/constants/record-filter";
import type { EntityKind } from "@/lib/admin/entity-profile";
import { intendedParentDisplay, surrogateDisplayName } from "@/lib/case-manager/display-names";
import { caseManagerAccessOrClauses } from "@/lib/case-manager/case-manager-access";
import { readCreatedByCmId } from "@/lib/party/create-party-entity";

export type PartyListRow = {
  entityId: string;
  email: string;
  displayName: string;
  userId: string | null;
  userEmail: string | null;
  source: "case" | "created";
  deleted_at: string | null;
};

type PartyBlob = {
  id: string | number;
  email: string | null;
  profile_data: unknown;
  deleted_at?: string | null;
  user: { id: string | number; email: string | null } | null;
};

function mapIp(r: PartyBlob, source: "case" | "created"): PartyListRow {
  return {
    entityId: String(r.id),
    email: r.user?.email?.trim() || r.email?.trim() || "",
    displayName: intendedParentDisplay(r.profile_data, r.email ?? undefined) || "—",
    userId: r.user?.id != null ? String(r.user.id) : null,
    userEmail: r.user?.email?.trim() || null,
    source,
    deleted_at: r.deleted_at ?? null,
  };
}

function mapSm(r: PartyBlob, source: "case" | "created"): PartyListRow {
  return {
    entityId: String(r.id),
    email: r.user?.email?.trim() || r.email?.trim() || "",
    displayName: surrogateDisplayName(r.profile_data, r.email ?? undefined) || "—",
    userId: r.user?.id != null ? String(r.user.id) : null,
    userEmail: r.user?.email?.trim() || null,
    source,
    deleted_at: r.deleted_at ?? null,
  };
}

/** CM：负责案例上的主体 + 自己建档尚未绑案的主体 */
export async function listCaseManagerParties(
  kind: EntityKind,
  cmId: string | null,
  sessionUserId: string,
  opts?: { q?: string; limit?: number; recordFilter?: RecordFilter; page?: number; pageSize?: number },
): Promise<{ rows: PartyListRow[]; total: number; page: number; pageSize: number }> {
  const fetchLimit = Math.min(500, Math.max(1, opts?.limit ?? 200));
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 20));
  const page = Math.max(1, opts?.page ?? 1);
  const q = opts?.q?.trim().toLowerCase() ?? "";
  const recordFilter = opts?.recordFilter ?? DEFAULT_RECORD_FILTER;
  /** 三态下每一行是否保留 */
  const keepByDeletedAt = (deleted_at: string | null | undefined) => {
    if (recordFilter === "all") return true;
    const isDeleted = Boolean(deleted_at);
    return recordFilter === "deleted" ? isDeleted : !isDeleted;
  };
  const accessOr = caseManagerAccessOrClauses(cmId, sessionUserId);
  const client = getClient();
  const byId = new Map<string, PartyListRow>();

  if (accessOr.length > 0) {
    /** 把「记录状态」下推到数据库，避免已删除行落在取数窗口之外 */
    const partyDeletedClause =
      recordFilter === "all"
        ? {}
        : recordFilter === "deleted"
          ? { deleted_at: { _is_null: false } }
          : { deleted_at: { _is_null: true } };
    const caseWhere = {
      _or: accessOr,
      archived_at: { _is_null: true },
      ...(kind === "intended_parent"
        ? { intended_parent: partyDeletedClause }
        : { surrogate_mother: partyDeletedClause }),
    };
    if (kind === "intended_parent") {
      const data = await client.execute<{
        cases: { intended_parent: PartyBlob | null }[];
      }>({
        query: `
          query CmListIpsFromCases($where: cases_bool_exp!, $limit: Int!) {
            cases(where: $where, limit: $limit, order_by: { updated_at: desc_nulls_last }) {
              intended_parent { id email profile_data deleted_at user { id email } }
            }
          }
        `,
        variables: { where: caseWhere, limit: fetchLimit },
      });
      for (const c of data.cases ?? []) {
        if (!c.intended_parent) continue;
        if (!keepByDeletedAt(c.intended_parent.deleted_at)) continue;
        const row = mapIp(c.intended_parent, "case");
        byId.set(row.entityId, row);
      }
    } else {
      const data = await client.execute<{
        cases: { surrogate_mother: PartyBlob | null }[];
      }>({
        query: `
          query CmListSmsFromCases($where: cases_bool_exp!, $limit: Int!) {
            cases(where: $where, limit: $limit, order_by: { updated_at: desc_nulls_last }) {
              surrogate_mother { id email profile_data deleted_at user { id email } }
            }
          }
        `,
        variables: { where: caseWhere, limit: fetchLimit },
      });
      for (const c of data.cases ?? []) {
        if (!c.surrogate_mother) continue;
        if (!keepByDeletedAt(c.surrogate_mother.deleted_at)) continue;
        const row = mapSm(c.surrogate_mother, "case");
        byId.set(row.entityId, row);
      }
    }
  }

  if (cmId) {
    const deletedClause =
      recordFilter === "all"
        ? []
        : recordFilter === "deleted"
          ? [{ deleted_at: { _is_null: false } }]
          : [{ deleted_at: { _is_null: true } }];
    const createdWhere = {
      _and: [
        { profile_data: { _contains: { _crm_meta: { created_by_cm_id: String(cmId) } } } },
        ...deletedClause,
      ],
    };
    try {
      if (kind === "intended_parent") {
        const data = await client.execute<{ intended_parents: PartyBlob[] }>({
          query: `
            query CmListIpsCreated($where: intended_parents_bool_exp!, $limit: Int!) {
              intended_parents(where: $where, limit: $limit, order_by: { id: desc }) {
                id email profile_data deleted_at user { id email }
              }
            }
          `,
          variables: { where: createdWhere, limit: fetchLimit },
        });
        for (const r of data.intended_parents ?? []) {
          const row = mapIp(r, byId.has(String(r.id)) ? "case" : "created");
          if (!byId.has(row.entityId)) byId.set(row.entityId, row);
        }
      } else {
        const data = await client.execute<{ surrogate_mothers: PartyBlob[] }>({
          query: `
            query CmListSmsCreated($where: surrogate_mothers_bool_exp!, $limit: Int!) {
              surrogate_mothers(where: $where, limit: $limit, order_by: { id: desc }) {
                id email profile_data deleted_at user { id email }
              }
            }
          `,
          variables: { where: createdWhere, limit: fetchLimit },
        });
        for (const r of data.surrogate_mothers ?? []) {
          const row = mapSm(r, byId.has(String(r.id)) ? "case" : "created");
          if (!byId.has(row.entityId)) byId.set(row.entityId, row);
        }
      }
    } catch (e) {
      // profile_data 须为 jsonb；失败时仍返回案例关联主体，避免整页 503
      console.error("[listCaseManagerParties] created-by filter failed", e);
    }
  }

  let rows = [...byId.values()].sort((a, b) => Number(b.entityId) - Number(a.entityId));
  if (q) {
    rows = rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        r.displayName.toLowerCase().includes(q) ||
        r.entityId.includes(q) ||
        (r.userEmail?.toLowerCase().includes(q) ?? false),
    );
  }
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
  };
}

export { readCreatedByCmId };
