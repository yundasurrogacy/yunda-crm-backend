import { getClient } from "@/config-lib/graphql-client";

export type PartyKind = "intended_parent" | "surrogate_mother";

const RESOLVE_IP = `
  query ResolveIpEntity($uid: bigint!) {
    intended_parents(where: { user_users: { _eq: $uid } }, limit: 1) {
      id
    }
  }
`;

const RESOLVE_SM = `
  query ResolveSmEntity($uid: bigint!) {
    surrogate_mothers(where: { user_users: { _eq: $uid } }, limit: 1) {
      id
    }
  }
`;

export async function resolvePartyEntityId(
  kind: PartyKind,
  userId: string,
): Promise<string | null> {
  const uid = userId?.trim();
  if (!uid) return null;
  const client = getClient();

  if (kind === "intended_parent") {
    const data = await client.execute<{ intended_parents: { id: string | number }[] }>({
      query: RESOLVE_IP,
      variables: { uid },
    });
    const id = data.intended_parents?.[0]?.id;
    return id == null ? null : String(id);
  }

  const data = await client.execute<{ surrogate_mothers: { id: string | number }[] }>({
    query: RESOLVE_SM,
    variables: { uid },
  });
  const id = data.surrogate_mothers?.[0]?.id;
  return id == null ? null : String(id);
}
