import { getClient } from "@/config-lib/graphql-client";
import type { CrmSession, PortalId } from "@/types/portal";

export type SessionIdentityEntity = {
  kind: PortalId;
  id: string;
  email: string | null;
};

export type SessionIdentity = {
  userId: string;
  userEmail: string;
  userRole: string;
  /** 当前壳层请求的业务身份；管理员壳为 null */
  entity: SessionIdentityEntity | null;
};

const Q_CM = `
  query IdentityCm($uid: bigint!) {
    case_managers(
      where: { user_users: { _eq: $uid }, deleted_at: { _is_null: true } }
      limit: 1
    ) {
      id
      email
    }
  }
`;

const Q_IP = `
  query IdentityIp($uid: bigint!) {
    intended_parents(
      where: { user_users: { _eq: $uid }, deleted_at: { _is_null: true } }
      limit: 1
    ) {
      id
      email
    }
  }
`;

const Q_SM = `
  query IdentitySm($uid: bigint!) {
    surrogate_mothers(
      where: { user_users: { _eq: $uid }, deleted_at: { _is_null: true } }
      limit: 1
    ) {
      id
      email
    }
  }
`;

export async function fetchSessionIdentity(
  session: CrmSession,
  shell: "admin" | PortalId,
): Promise<SessionIdentity> {
  const base: SessionIdentity = {
    userId: session.userId,
    userEmail: session.email,
    userRole: session.role,
    entity: null,
  };

  if (shell === "admin") return base;

  const client = getClient();
  try {
    if (shell === "case_manager") {
      const data = await client.execute<{
        case_managers: { id: string | number; email: string | null }[];
      }>({ query: Q_CM, variables: { uid: session.userId } });
      const row = data.case_managers?.[0];
      if (!row) return base;
      return {
        ...base,
        entity: {
          kind: "case_manager",
          id: String(row.id),
          email: row.email?.trim() || null,
        },
      };
    }
    if (shell === "intended_parent") {
      const data = await client.execute<{
        intended_parents: { id: string | number; email: string | null }[];
      }>({ query: Q_IP, variables: { uid: session.userId } });
      const row = data.intended_parents?.[0];
      if (!row) return base;
      return {
        ...base,
        entity: {
          kind: "intended_parent",
          id: String(row.id),
          email: row.email?.trim() || null,
        },
      };
    }
    const data = await client.execute<{
      surrogate_mothers: { id: string | number; email: string | null }[];
    }>({ query: Q_SM, variables: { uid: session.userId } });
    const row = data.surrogate_mothers?.[0];
    if (!row) return base;
    return {
      ...base,
      entity: {
        kind: "surrogate_mother",
        id: String(row.id),
        email: row.email?.trim() || null,
      },
    };
  } catch {
    return base;
  }
}
