import type { GraphQLClient } from "@/config-lib/graphql-client";

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

const INSERT_CM = `
  mutation BindInsertCm($userId: bigint!) {
    insert_case_managers_one(object: { user_users: $userId }) { id }
  }
`;

const INSERT_IP = `
  mutation BindInsertIp($userId: bigint!, $email: String!) {
    insert_intended_parents_one(object: { user_users: $userId, email: $email, contact_information: {} }) { id }
  }
`;

const INSERT_SM = `
  mutation BindInsertSm($userId: bigint!, $email: String!) {
    insert_surrogate_mothers_one(object: { user_users: $userId, email: $email, contact_information: {} }) { id }
  }
`;

/** 将已存在的 `users` 行绑定到业务表（幂等：已存在则返回已有 id）。 */
export async function bindUserToBusinessRole(
  client: GraphQLClient,
  userId: string,
  kind: BindRoleKind,
  userEmail: string,
): Promise<{ ok: true; entityId: string; alreadyLinked: boolean } | { ok: false; message: string }> {
  const email = userEmail.trim().toLowerCase();
  if (kind === "case_manager") {
    const existing = await client.execute<{ case_managers: { id: string | number }[] }>({
      query: Q_CM,
      variables: { uid: userId },
    });
    const row = existing.case_managers?.[0];
    if (row) return { ok: true, entityId: String(row.id), alreadyLinked: true };
    const ins = await client.execute<{ insert_case_managers_one: { id: string | number } | null }>({
      query: INSERT_CM,
      variables: { userId },
    });
    const id = ins.insert_case_managers_one?.id;
    if (id == null) return { ok: false, message: "insert_failed" };
    return { ok: true, entityId: String(id), alreadyLinked: false };
  }
  if (kind === "intended_parent") {
    const existing = await client.execute<{ intended_parents: { id: string | number }[] }>({
      query: Q_IP,
      variables: { uid: userId },
    });
    const row = existing.intended_parents?.[0];
    if (row) return { ok: true, entityId: String(row.id), alreadyLinked: true };
    const ins = await client.execute<{ insert_intended_parents_one: { id: string | number } | null }>({
      query: INSERT_IP,
      variables: { userId, email },
    });
    const id = ins.insert_intended_parents_one?.id;
    if (id == null) return { ok: false, message: "insert_failed" };
    return { ok: true, entityId: String(id), alreadyLinked: false };
  }
  const existing = await client.execute<{ surrogate_mothers: { id: string | number }[] }>({
    query: Q_SM,
    variables: { uid: userId },
  });
  const row = existing.surrogate_mothers?.[0];
  if (row) return { ok: true, entityId: String(row.id), alreadyLinked: true };
  const ins = await client.execute<{ insert_surrogate_mothers_one: { id: string | number } | null }>({
    query: INSERT_SM,
    variables: { userId, email },
  });
  const id = ins.insert_surrogate_mothers_one?.id;
  if (id == null) return { ok: false, message: "insert_failed" };
  return { ok: true, entityId: String(id), alreadyLinked: false };
}
