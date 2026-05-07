import { getClient } from "@/config-lib/graphql-client";
import type { CrmSession, PortalId } from "@/types/portal";
import { verifyStoredPassword } from "@/lib/auth/password";
import { graphqlClientInstanceConfig } from "@/project-config";

type UserLoginRow = {
  id: string;
  email: string;
  password: string;
  role: string;
  case_managers: { id: string }[];
  intended_parents: { id: string }[];
  surrogate_mothers: { id: string }[];
};

const LOGIN_QUERY = `
  query CrmLoginUser($email: String!) {
    users(where: { email: { _eq: $email } }, limit: 1) {
      id
      email
      password
      role
      case_managers(limit: 1) { id }
      intended_parents(limit: 1) { id }
      surrogate_mothers(limit: 1) { id }
    }
  }
`;

export async function authenticateCrmUser(
  emailRaw: string,
  passwordPlain: string,
): Promise<
  | { ok: true; session: CrmSession }
  | { ok: false; reason: "invalid_credentials" | "misconfigured" }
> {
  const secret =
    graphqlClientInstanceConfig.headers["x-hasura-admin-secret"] ?? "";
  if (!String(secret).trim()) {
    return { ok: false, reason: "misconfigured" };
  }

  const email = emailRaw.trim();
  if (!email || !passwordPlain) {
    return { ok: false, reason: "invalid_credentials" };
  }

  let rows: UserLoginRow[];
  try {
    const client = getClient();
    const data = await client.execute<{ users: UserLoginRow[] }>({
      query: LOGIN_QUERY,
      variables: { email },
    });
    rows = data.users ?? [];
  } catch {
    return { ok: false, reason: "misconfigured" };
  }

  const row = rows[0];
  if (!row || !verifyStoredPassword(passwordPlain, row.password)) {
    return { ok: false, reason: "invalid_credentials" };
  }

  const portals: PortalId[] = [];
  if (row.case_managers?.length) portals.push("case_manager");
  if (row.intended_parents?.length) portals.push("intended_parent");
  if (row.surrogate_mothers?.length) portals.push("surrogate_mother");

  const session: CrmSession = {
    userId: String(row.id),
    email: row.email,
    role: row.role,
    portals,
    activePortal: null,
  };

  return { ok: true, session };
}
