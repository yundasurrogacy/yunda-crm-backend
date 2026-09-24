import type { GraphQLClient } from "@/config-lib/graphql-client";

import type { BindRoleKind } from "./bind-user-role";

const USER_BY_EMAIL = `
  query AdminUserByEmail($email: String!) {
    users(where: { email: { _eq: $email } }, limit: 1) {
      id
      email
    }
  }
`;

const DUP_CM = `
  query LinkDupCm($uid: bigint!, $notId: bigint!) {
    case_managers(where: { user_users: { _eq: $uid }, id: { _neq: $notId } }, limit: 1) {
      id
    }
  }
`;

const DUP_IP = `
  query LinkDupIp($uid: bigint!, $notId: bigint!) {
    intended_parents(where: { user_users: { _eq: $uid }, id: { _neq: $notId } }, limit: 1) {
      id
    }
  }
`;

const DUP_SM = `
  query LinkDupSm($uid: bigint!, $notId: bigint!) {
    surrogate_mothers(where: { user_users: { _eq: $uid }, id: { _neq: $notId } }, limit: 1) {
      id
    }
  }
`;

/**
 * 绑定时会把登录账号邮箱同步写进业务表，而业务表的 email 上有唯一约束
 * （如 intended_parents_email_key）。若该邮箱已被别的档案占用，写库会直接违反约束。
 * 这里提前查出来，避免用户只看到笼统的「绑定失败」。
 */
const EMAIL_OWNER_CM = `
  query LinkEmailOwnerCm($email: String!, $notId: bigint!) {
    case_managers(where: { email: { _eq: $email }, id: { _neq: $notId } }, limit: 1) {
      id
      deleted_at
    }
  }
`;

const EMAIL_OWNER_IP = `
  query LinkEmailOwnerIp($email: String!, $notId: bigint!) {
    intended_parents(where: { email: { _eq: $email }, id: { _neq: $notId } }, limit: 1) {
      id
      deleted_at
    }
  }
`;

const EMAIL_OWNER_SM = `
  query LinkEmailOwnerSm($email: String!, $notId: bigint!) {
    surrogate_mothers(where: { email: { _eq: $email }, id: { _neq: $notId } }, limit: 1) {
      id
      deleted_at
    }
  }
`;

const UPDATE_CM = `
  mutation AdminLinkCaseManager($id: bigint!, $uid: bigint!, $email: String!) {
    update_case_managers_by_pk(
      pk_columns: { id: $id }
      _set: { user_users: $uid, email: $email }
    ) {
      id
    }
  }
`;

const UPDATE_IP = `
  mutation AdminLinkIntendedParent($id: bigint!, $uid: bigint!, $email: String!) {
    update_intended_parents_by_pk(
      pk_columns: { id: $id }
      _set: { user_users: $uid, email: $email }
    ) {
      id
    }
  }
`;

const UPDATE_SM = `
  mutation AdminLinkSurrogateMother($id: bigint!, $uid: bigint!, $email: String!) {
    update_surrogate_mothers_by_pk(
      pk_columns: { id: $id }
      _set: { user_users: $uid, email: $email }
    ) {
      id
    }
  }
`;

export type LinkEntityCode =
  | "user_not_found"
  | "entity_not_found"
  | "user_bound_elsewhere"
  | "email_taken_by_other_entity"
  | "update_failed";

export type LinkEntityResult =
  | { ok: true }
  | {
      ok: false;
      code: LinkEntityCode;
      /** code 为 email_taken_by_other_entity 时，占用该邮箱的档案 id */
      conflictEntityId?: string;
      /** 占用邮箱的档案是否已软删除（提示文案要区分，软删除的需先处理或恢复） */
      conflictDeleted?: boolean;
    };

type EmailOwnerRow = { id: string | number; deleted_at: string | null };

const EMAIL_OWNER_QUERY: Record<BindRoleKind, { query: string; key: string }> = {
  case_manager: { query: EMAIL_OWNER_CM, key: "case_managers" },
  intended_parent: { query: EMAIL_OWNER_IP, key: "intended_parents" },
  surrogate_mother: { query: EMAIL_OWNER_SM, key: "surrogate_mothers" },
};

/** 查该邮箱是否已被「另一条」同类业务记录占用（唯一约束是大小写敏感的精确匹配）。 */
async function findEmailOwner(
  client: GraphQLClient,
  kind: BindRoleKind,
  email: string,
  notId: string,
): Promise<{ id: string; deleted: boolean } | null> {
  const { query, key } = EMAIL_OWNER_QUERY[kind];
  const data = await client.execute<Record<string, EmailOwnerRow[]>>({
    query,
    variables: { email, notId },
  });
  const row = data[key]?.[0];
  if (!row) return null;
  return { id: String(row.id), deleted: Boolean(row.deleted_at) };
}

/** 将已有 users 行绑定到指定的业务表行（覆盖该行原先的 user_users）。 */
export async function linkEntityToUser(
  client: GraphQLClient,
  kind: BindRoleKind,
  entityId: string,
  userEmail: string,
): Promise<LinkEntityResult> {
  const email = userEmail.trim().toLowerCase();
  if (!email) return { ok: false, code: "user_not_found" };

  try {
    const userRes = await client.execute<{ users: { id: string | number; email: string }[] }>({
      query: USER_BY_EMAIL,
      variables: { email },
    });
    const user = userRes.users?.[0];
    if (!user) return { ok: false, code: "user_not_found" };

    const userId = String(user.id);
    const syncEmail = (user.email ?? email).trim().toLowerCase();

    if (kind === "case_manager") {
      const dup = await client.execute<{ case_managers: { id: string | number }[] }>({
        query: DUP_CM,
        variables: { uid: userId, notId: entityId },
      });
      if (dup.case_managers?.length) return { ok: false, code: "user_bound_elsewhere" };

      const emailOwner = await findEmailOwner(client, kind, syncEmail, entityId);
      if (emailOwner) {
        return {
          ok: false,
          code: "email_taken_by_other_entity",
          conflictEntityId: emailOwner.id,
          conflictDeleted: emailOwner.deleted,
        };
      }

      const upd = await client.execute<{ update_case_managers_by_pk: { id: string | number } | null }>({
        query: UPDATE_CM,
        variables: { id: entityId, uid: userId, email: syncEmail },
      });
      if (!upd.update_case_managers_by_pk) return { ok: false, code: "entity_not_found" };
      return { ok: true };
    }

    if (kind === "intended_parent") {
      const dup = await client.execute<{ intended_parents: { id: string | number }[] }>({
        query: DUP_IP,
        variables: { uid: userId, notId: entityId },
      });
      if (dup.intended_parents?.length) return { ok: false, code: "user_bound_elsewhere" };

      const emailOwner = await findEmailOwner(client, kind, syncEmail, entityId);
      if (emailOwner) {
        return {
          ok: false,
          code: "email_taken_by_other_entity",
          conflictEntityId: emailOwner.id,
          conflictDeleted: emailOwner.deleted,
        };
      }

      const upd = await client.execute<{ update_intended_parents_by_pk: { id: string | number } | null }>({
        query: UPDATE_IP,
        variables: { id: entityId, uid: userId, email: syncEmail },
      });
      if (!upd.update_intended_parents_by_pk) return { ok: false, code: "entity_not_found" };
      return { ok: true };
    }

    const dup = await client.execute<{ surrogate_mothers: { id: string | number }[] }>({
      query: DUP_SM,
      variables: { uid: userId, notId: entityId },
    });
    if (dup.surrogate_mothers?.length) return { ok: false, code: "user_bound_elsewhere" };

    const emailOwner = await findEmailOwner(client, kind, syncEmail, entityId);
    if (emailOwner) {
      return {
        ok: false,
        code: "email_taken_by_other_entity",
        conflictEntityId: emailOwner.id,
        conflictDeleted: emailOwner.deleted,
      };
    }

    const upd = await client.execute<{ update_surrogate_mothers_by_pk: { id: string | number } | null }>({
      query: UPDATE_SM,
      variables: { id: entityId, uid: userId, email: syncEmail },
    });
    if (!upd.update_surrogate_mothers_by_pk) return { ok: false, code: "entity_not_found" };
    return { ok: true };
  } catch {
    return { ok: false, code: "update_failed" };
  }
}
