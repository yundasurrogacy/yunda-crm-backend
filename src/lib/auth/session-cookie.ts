import { cookies } from "next/headers";
import { cache } from "react";
import type { CrmSession } from "@/types/portal";
import { CRM_SESSION_COOKIE } from "./constants";
import { parseSession, stringifySession } from "./session-codec";
import { getClient } from "@/config-lib/graphql-client";

const maxAge = 60 * 60 * 24 * 7;

const Q_ACCOUNT_STATE = `
  query CrmSessionAccountState($id: bigint!) {
    users_by_pk(id: $id) {
      id
      role
      disabled_at
    }
  }
`;

type SessionAccountState = { role: string } | null;

/**
 * 查库确认账号当前可用（存在且未停用），并取回**数据库里的真实角色**。
 *
 * 会话 cookie 是无状态的，本身无法撤销，也携带不了最新权限 —— 若不查库：
 * - 「停用登录」对已登录的人要等 cookie 过期（最长 7 天）才生效；
 * - 「降级管理员」同样最长 7 天不生效，被降级的人仍是管理员。
 * 这里按主键查一次，使两者都立即生效，且角色以数据库为准（cookie 里的 role 不再可信）。
 *
 * 查库失败时**放行**（fail-open）并保持 cookie 里的角色：此刻后端多半已不可用，
 * 锁死所有人只会扩大故障；停用/降级都是低频操作，短暂放行的风险更小。
 */
const loadSessionAccount = cache(async (userId: string): Promise<SessionAccountState> => {
  if (!/^\d+$/u.test(userId)) return null;
  try {
    const client = getClient();
    const data = await client.execute<{
      users_by_pk: { id: string | number; role: string; disabled_at: string | null } | null;
    }>({ query: Q_ACCOUNT_STATE, variables: { id: userId } });
    const row = data.users_by_pk;
    // 账号不存在（例如已删除）或已停用 → 会话失效
    if (!row || row.disabled_at) return null;
    return { role: row.role };
  } catch (e) {
    console.error("[session] account check failed, allowing cookie claims (fail-open)", e);
    return { role: "" }; // 空角色 → 调用方保留 cookie 里的角色
  }
});

export async function getServerSession(): Promise<CrmSession | null> {
  const jar = await cookies();
  const session = parseSession(jar.get(CRM_SESSION_COOKIE)?.value);
  if (!session) return null;

  const account = await loadSessionAccount(session.userId);
  if (!account) return null;
  // 角色以数据库为准；空字符串表示查库失败，退回 cookie 中的角色
  return account.role ? { ...session, role: account.role } : session;
}

export async function setServerSession(sess: CrmSession) {
  const jar = await cookies();
  jar.set(CRM_SESSION_COOKIE, stringifySession(sess), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearServerSession() {
  const jar = await cookies();
  jar.set(CRM_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
