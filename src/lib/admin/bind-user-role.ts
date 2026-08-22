import type { GraphQLClient } from "@/config-lib/graphql-client";

import { linkEntityToUser } from "./link-entity-user";

export type BindRoleKind = "case_manager" | "intended_parent" | "surrogate_mother";

const Q_CM = `
  query BindExistsCm($uid: bigint!) {
    case_managers(where: { user_users: { _eq: $uid } }, limit: 1) { id }
  }
`;

const Q_IP = `
  query BindExistsIp($uid: bigint!) {
    intended_parents(where: { user_users: { _eq: $uid } }, limit: 1) { id }
  }
`;

const Q_SM = `
  query BindExistsSm($uid: bigint!) {
    surrogate_mothers(where: { user_users: { _eq: $uid } }, limit: 1) { id }
  }
`;

const Q_IP_BY_EMAIL_UNBOUND = `
  query BindIpByEmailUnbound($email: String!) {
    intended_parents(
      where: { email: { _eq: $email }, user_users: { _is_null: true } }
      limit: 1
      order_by: { id: desc }
    ) { id }
  }
`;

const Q_SM_BY_EMAIL_UNBOUND = `
  query BindSmByEmailUnbound($email: String!) {
    surrogate_mothers(
      where: { email: { _eq: $email }, user_users: { _is_null: true } }
      limit: 1
      order_by: { id: desc }
    ) { id }
  }
`;

const Q_CM_BY_EMAIL_UNBOUND = `
  query BindCmByEmailUnbound($email: String!) {
    case_managers(
      where: { email: { _eq: $email }, user_users: { _is_null: true } }
      limit: 1
      order_by: { id: desc }
    ) { id }
  }
`;

const INSERT_CM = `
  mutation BindInsertCm($userId: bigint!, $email: String!) {
    insert_case_managers_one(object: { user_users: $userId, email: $email, profile_data: {} }) { id }
  }
`;

const INSERT_IP = `
  mutation BindInsertIp($userId: bigint!, $email: String!) {
    insert_intended_parents_one(object: { user_users: $userId, email: $email, profile_data: {} }) { id }
  }
`;

const INSERT_SM = `
  mutation BindInsertSm($userId: bigint!, $email: String!) {
    insert_surrogate_mothers_one(object: { user_users: $userId, email: $email, profile_data: {} }) { id }
  }
`;

const LIST_UNBOUND_CM_BY_ID = `
  query ListUnboundCmById($id: bigint!) {
    case_managers(
      where: {
        id: { _eq: $id }
        user_users: { _is_null: true }
        deleted_at: { _is_null: true }
      }
      limit: 1
    ) { id email }
  }
`;

const LIST_UNBOUND_CM_ALL = `
  query ListUnboundCmAll($limit: Int!) {
    case_managers(
      where: { user_users: { _is_null: true }, deleted_at: { _is_null: true } }
      order_by: { id: desc }
      limit: $limit
    ) { id email }
  }
`;

const LIST_UNBOUND_IP = `
  query ListUnboundIp($limit: Int!) {
    intended_parents(
      where: { user_users: { _is_null: true }, deleted_at: { _is_null: true } }
      order_by: { id: desc }
      limit: $limit
    ) {
      id
      email
    }
  }
`;

const LIST_UNBOUND_SM = `
  query ListUnboundSm($limit: Int!) {
    surrogate_mothers(
      where: { user_users: { _is_null: true }, deleted_at: { _is_null: true } }
      order_by: { id: desc }
      limit: $limit
    ) {
      id
      email
    }
  }
`;

export type UnboundEntityOption = { id: string; label: string };

/** 列出尚未绑定登录账号的业务档案，供管理端选择绑定。 */
export async function listUnboundEntities(
  client: GraphQLClient,
  kind: BindRoleKind,
  opts?: { q?: string; limit?: number },
): Promise<UnboundEntityOption[]> {
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 50));
  const q = opts?.q?.trim() ?? "";

  if (kind === "case_manager") {
    if (q && /^\d+$/u.test(q)) {
      const data = await client.execute<{
        case_managers: { id: string | number; email: string | null }[];
      }>({
        query: LIST_UNBOUND_CM_BY_ID,
        variables: { id: q },
      });
      return (data.case_managers ?? []).map((r) => ({
        id: String(r.id),
        label: `${r.email?.trim() || "—"} (#${r.id})`,
      }));
    }
    const data = await client.execute<{
      case_managers: { id: string | number; email: string | null }[];
    }>({
      query: LIST_UNBOUND_CM_ALL,
      variables: { limit: 200 },
    });
    const qLower = q.toLowerCase();
    return (data.case_managers ?? [])
      .map((r) => ({
        id: String(r.id),
        label: `${r.email?.trim() || "—"} (#${r.id})`,
      }))
      .filter((r) => !qLower || r.label.toLowerCase().includes(qLower) || r.id.includes(q))
      .slice(0, limit);
  }

  if (kind === "intended_parent") {
    const data = await client.execute<{
      intended_parents: { id: string | number; email: string | null }[];
    }>({
      query: LIST_UNBOUND_IP,
      variables: { limit: 200 },
    });
    const qLower = q.toLowerCase();
    return (data.intended_parents ?? [])
      .map((r) => ({
        id: String(r.id),
        label: `${r.email?.trim() || "—"} (#${r.id})`,
      }))
      .filter((r) => !qLower || r.label.toLowerCase().includes(qLower) || r.id.includes(q))
      .slice(0, limit);
  }

  const data = await client.execute<{
    surrogate_mothers: { id: string | number; email: string | null }[];
  }>({
    query: LIST_UNBOUND_SM,
    variables: { limit: 200 },
  });
  const qLower = q.toLowerCase();
  return (data.surrogate_mothers ?? [])
    .map((r) => ({
      id: String(r.id),
      label: `${r.email?.trim() || "—"} (#${r.id})`,
    }))
    .filter((r) => !qLower || r.label.toLowerCase().includes(qLower) || r.id.includes(q))
    .slice(0, limit);
}

/**
 * 将已存在的 `users` 行绑定到业务表。
 * - 已绑同类 → 幂等返回
 * - 指定 entityId → 绑到该档案
 * - 否则：优先重绑「同邮箱且未绑定」的档案（解绑后再绑），再新建
 */
export async function bindUserToBusinessRole(
  client: GraphQLClient,
  userId: string,
  kind: BindRoleKind,
  userEmail: string,
  opts?: { entityId?: string },
): Promise<
  | { ok: true; entityId: string; alreadyLinked: boolean; reclaimed: boolean }
  | { ok: false; message: string }
> {
  const email = userEmail.trim().toLowerCase();
  const preferredId = opts?.entityId?.trim();

  if (preferredId && /^\d+$/u.test(preferredId)) {
    const linked = await linkEntityToUser(client, kind, preferredId, email);
    if (!linked.ok) return { ok: false, message: linked.code };
    return { ok: true, entityId: preferredId, alreadyLinked: false, reclaimed: true };
  }

  if (kind === "case_manager") {
    const existing = await client.execute<{ case_managers: { id: string | number }[] }>({
      query: Q_CM,
      variables: { uid: userId },
    });
    const row = existing.case_managers?.[0];
    if (row) return { ok: true, entityId: String(row.id), alreadyLinked: true, reclaimed: false };

    const unbound = await client.execute<{ case_managers: { id: string | number }[] }>({
      query: Q_CM_BY_EMAIL_UNBOUND,
      variables: { email },
    });
    const reclaimId = unbound.case_managers?.[0]?.id;
    if (reclaimId != null) {
      const linked = await linkEntityToUser(client, kind, String(reclaimId), email);
      if (!linked.ok) return { ok: false, message: linked.code };
      return { ok: true, entityId: String(reclaimId), alreadyLinked: false, reclaimed: true };
    }

    try {
      const ins = await client.execute<{ insert_case_managers_one: { id: string | number } | null }>({
        query: INSERT_CM,
        variables: { userId, email },
      });
      const id = ins.insert_case_managers_one?.id;
      if (id == null) return { ok: false, message: "insert_failed" };
      return { ok: true, entityId: String(id), alreadyLinked: false, reclaimed: false };
    } catch {
      return { ok: false, message: "insert_failed" };
    }
  }

  if (kind === "intended_parent") {
    const existing = await client.execute<{ intended_parents: { id: string | number }[] }>({
      query: Q_IP,
      variables: { uid: userId },
    });
    const row = existing.intended_parents?.[0];
    if (row) return { ok: true, entityId: String(row.id), alreadyLinked: true, reclaimed: false };

    const unbound = await client.execute<{ intended_parents: { id: string | number }[] }>({
      query: Q_IP_BY_EMAIL_UNBOUND,
      variables: { email },
    });
    const reclaimId = unbound.intended_parents?.[0]?.id;
    if (reclaimId != null) {
      const linked = await linkEntityToUser(client, kind, String(reclaimId), email);
      if (!linked.ok) return { ok: false, message: linked.code };
      return { ok: true, entityId: String(reclaimId), alreadyLinked: false, reclaimed: true };
    }

    try {
      const ins = await client.execute<{ insert_intended_parents_one: { id: string | number } | null }>({
        query: INSERT_IP,
        variables: { userId, email },
      });
      const id = ins.insert_intended_parents_one?.id;
      if (id == null) return { ok: false, message: "insert_failed" };
      return { ok: true, entityId: String(id), alreadyLinked: false, reclaimed: false };
    } catch {
      return { ok: false, message: "insert_failed" };
    }
  }

  const existing = await client.execute<{ surrogate_mothers: { id: string | number }[] }>({
    query: Q_SM,
    variables: { uid: userId },
  });
  const row = existing.surrogate_mothers?.[0];
  if (row) return { ok: true, entityId: String(row.id), alreadyLinked: true, reclaimed: false };

  const unbound = await client.execute<{ surrogate_mothers: { id: string | number }[] }>({
    query: Q_SM_BY_EMAIL_UNBOUND,
    variables: { email },
  });
  const reclaimId = unbound.surrogate_mothers?.[0]?.id;
  if (reclaimId != null) {
    const linked = await linkEntityToUser(client, kind, String(reclaimId), email);
    if (!linked.ok) return { ok: false, message: linked.code };
    return { ok: true, entityId: String(reclaimId), alreadyLinked: false, reclaimed: true };
  }

  try {
    const ins = await client.execute<{ insert_surrogate_mothers_one: { id: string | number } | null }>({
      query: INSERT_SM,
      variables: { userId, email },
    });
    const id = ins.insert_surrogate_mothers_one?.id;
    if (id == null) return { ok: false, message: "insert_failed" };
    return { ok: true, entityId: String(id), alreadyLinked: false, reclaimed: false };
  } catch {
    return { ok: false, message: "insert_failed" };
  }
}

const UNBIND_CM = `
  mutation UnbindCm($uid: bigint!) {
    update_case_managers(
      where: { user_users: { _eq: $uid } }
      _set: { user_users: null }
    ) {
      affected_rows
    }
  }
`;

const UNBIND_IP = `
  mutation UnbindIp($uid: bigint!) {
    update_intended_parents(
      where: { user_users: { _eq: $uid } }
      _set: { user_users: null }
    ) {
      affected_rows
    }
  }
`;

const UNBIND_SM = `
  mutation UnbindSm($uid: bigint!) {
    update_surrogate_mothers(
      where: { user_users: { _eq: $uid } }
      _set: { user_users: null }
    ) {
      affected_rows
    }
  }
`;

/** 解除 users ↔ 业务表绑定（清空业务行的 user_users；业务行与档案保留）。 */
export async function unbindUserFromBusinessRole(
  client: GraphQLClient,
  userId: string,
  kind: BindRoleKind,
): Promise<{ ok: true; affected: number } | { ok: false; message: string }> {
  try {
    if (kind === "case_manager") {
      const res = await client.execute<{
        update_case_managers: { affected_rows: number | null } | null;
      }>({
        query: UNBIND_CM,
        variables: { uid: userId },
      });
      return { ok: true, affected: res.update_case_managers?.affected_rows ?? 0 };
    }
    if (kind === "intended_parent") {
      const res = await client.execute<{
        update_intended_parents: { affected_rows: number | null } | null;
      }>({
        query: UNBIND_IP,
        variables: { uid: userId },
      });
      return { ok: true, affected: res.update_intended_parents?.affected_rows ?? 0 };
    }
    const res = await client.execute<{
      update_surrogate_mothers: { affected_rows: number | null } | null;
    }>({
      query: UNBIND_SM,
      variables: { uid: userId },
    });
    return { ok: true, affected: res.update_surrogate_mothers?.affected_rows ?? 0 };
  } catch {
    return { ok: false, message: "unbind_failed" };
  }
}
