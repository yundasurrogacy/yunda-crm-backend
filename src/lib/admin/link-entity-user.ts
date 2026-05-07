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

const UPDATE_CM = `
  mutation AdminLinkCaseManager($id: bigint!, $uid: bigint!) {
    update_case_managers_by_pk(pk_columns: { id: $id }, _set: { user_users: $uid }) {
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
  | "update_failed";

export type LinkEntityResult = { ok: true } | { ok: false; code: LinkEntityCode };

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

      const upd = await client.execute<{ update_case_managers_by_pk: { id: string | number } | null }>({
        query: UPDATE_CM,
        variables: { id: entityId, uid: userId },
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
