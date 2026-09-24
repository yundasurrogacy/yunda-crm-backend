import { getClient } from "@/config-lib/graphql-client";

/** 账号停用 / 恢复（不删除任何数据） */

const GET_USER = `
  query GetUserDisabled($id: bigint!) {
    users_by_pk(id: $id) {
      id
      email
      role
      disabled_at
    }
  }
`;

const SET_DISABLED = `
  mutation SetUserDisabled($id: bigint!, $disabled_at: timestamptz) {
    update_users_by_pk(pk_columns: { id: $id }, _set: { disabled_at: $disabled_at }) {
      id
      disabled_at
    }
  }
`;

const COUNT_ACTIVE_ADMINS = `
  query CountActiveAdmins {
    users_aggregate(where: { role: { _eq: "admin" }, disabled_at: { _is_null: true } }) {
      aggregate {
        count
      }
    }
  }
`;

export type UserDisableError =
  | "not_found"
  | "cannot_disable_self"
  | "update_failed";

export type UserDisableResult =
  | { ok: true; disabled_at: string | null }
  | { ok: false; error: UserDisableError };

/** 当前「未停用」的管理员数量 */
export async function countActiveAdmins(): Promise<number> {
  const client = getClient();
  const admins = await client.execute<{
    users_aggregate: { aggregate: { count: number } | null };
  }>({ query: COUNT_ACTIVE_ADMINS });
  return admins.users_aggregate?.aggregate?.count ?? 0;
}

/**
 * 目标账号是否属于「最后一个可用的管理员」。
 *
 * 用于「降级管理员」这类会使可用管理员数减少-1 的操作：若目标已是最后一个，
 * 操作后后台将无人可进。
 *
 * 注意：账号停用**不需要**这个判断 —— 停用有「不能停用自己」的硬约束，而操作者
 * 本身必须是可用管理员，因此目标之外必然还剩至少 1 个管理员。这个函数存在的意义
 * 是覆盖 PATCH 改角色这条真正可导致锁死的路径（唯一管理员把自己降成普通用户）。
 */
export async function isLastActiveAdmin(targetUserId: string): Promise<boolean> {
  const client = getClient();
  const found = await client.execute<{
    users_by_pk: { id: string | number; role: string; disabled_at: string | null } | null;
  }>({ query: GET_USER, variables: { id: targetUserId } });
  const row = found.users_by_pk;
  if (!row || row.role !== "admin" || row.disabled_at) return false;
  try {
    return (await countActiveAdmins()) <= 1;
  } catch {
    // 数不清管理员时宁可当作「最后一个」，避免把后台锁死
    return true;
  }
}

/**
 * 停用 / 恢复某个登录账号。
 *
 * 只有一道保护：不能停用自己。这已足以避免把后台锁死 —— 操作者必须是可用管理员，
 * 且不能停用自己，所以停用后系统里一定还剩至少一个可用管理员。
 */
export async function setUserDisabled(
  actorUserId: string,
  targetUserId: string,
  disabled: boolean,
): Promise<UserDisableResult> {
  if (!/^\d+$/u.test(targetUserId)) return { ok: false, error: "not_found" };

  const client = getClient();

  const found = await client.execute<{
    users_by_pk: { id: string | number; email: string; role: string; disabled_at: string | null } | null;
  }>({ query: GET_USER, variables: { id: targetUserId } });
  const row = found.users_by_pk;
  if (!row) return { ok: false, error: "not_found" };

  if (disabled && String(row.id) === String(actorUserId)) {
    return { ok: false, error: "cannot_disable_self" };
  }

  const disabledAt = disabled ? new Date().toISOString() : null;
  try {
    const data = await client.execute<{
      update_users_by_pk: { id: string | number; disabled_at: string | null } | null;
    }>({ query: SET_DISABLED, variables: { id: targetUserId, disabled_at: disabledAt } });
    const updated = data.update_users_by_pk;
    if (!updated) return { ok: false, error: "not_found" };
    return { ok: true, disabled_at: updated.disabled_at ?? null };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}
