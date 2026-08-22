import { getClient } from "@/config-lib/graphql-client";

const INSERT_CM_UNBOUND = `
  mutation CreateCaseManagerUnbound($email: String!) {
    insert_case_managers_one(object: { user_users: null, email: $email, profile_data: {} }) {
      id
      email
    }
  }
`;

export type CreateCaseManagerResult =
  | { ok: true; id: string }
  | { ok: false; error: "bad_email" | "email_taken" | "insert_failed" };

function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 200) return null;
  return email;
}

/** 直接新建案例经理业务行（可不绑登录账号；邮箱必填） */
export async function createCaseManagerEntity(emailRaw: string): Promise<CreateCaseManagerResult> {
  const email = normalizeEmail(emailRaw);
  if (!email) return { ok: false, error: "bad_email" };

  try {
    const client = getClient();
    const data = await client.execute<{
      insert_case_managers_one: { id: string | number; email: string | null } | null;
    }>({
      query: INSERT_CM_UNBOUND,
      variables: { email },
    });
    const id = data.insert_case_managers_one?.id;
    if (id == null) return { ok: false, error: "insert_failed" };
    return { ok: true, id: String(id) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[createCaseManagerEntity]", msg);
    if (/unique|duplicate|case_managers_email/i.test(msg)) {
      return { ok: false, error: "email_taken" };
    }
    return { ok: false, error: "insert_failed" };
  }
}
