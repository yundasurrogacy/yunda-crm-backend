import { getClient } from "@/config-lib/graphql-client";
import type { EntityKind } from "@/lib/admin/entity-profile";

const INSERT_IP = `
  mutation CreateIntendedParent($email: String!, $profile_data: jsonb!) {
    insert_intended_parents_one(
      object: { email: $email, profile_data: $profile_data, user_users: null }
    ) {
      id
    }
  }
`;

const INSERT_SM = `
  mutation CreateSurrogateMother($email: String!, $profile_data: jsonb!) {
    insert_surrogate_mothers_one(
      object: { email: $email, profile_data: $profile_data, user_users: null }
    ) {
      id
    }
  }
`;

export type CreatePartyEntityInput = {
  kind: EntityKind;
  email: string;
  /** 写入 profile 的展示名（IP→ip1_full_name，GC→full_name） */
  displayName?: string;
  /** CM 建档时写入，用于列表/鉴权（不依赖是否已绑 case） */
  createdByCmId?: string | null;
  createdByUserId?: string | null;
};

export type CreatePartyEntityResult =
  | { ok: true; id: string }
  | { ok: false; error: "bad_email" | "insert_failed" | "email_taken" };

function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 200) return null;
  return email;
}

/** 直接建业务主体档案（可不绑登录账号） */
export async function createPartyEntity(
  input: CreatePartyEntityInput,
): Promise<CreatePartyEntityResult> {
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, error: "bad_email" };

  const profile_data: Record<string, unknown> = {};
  const name = input.displayName?.trim();
  if (name) {
    if (input.kind === "intended_parent") profile_data.ip1_full_name = name;
    else profile_data.full_name = name;
  }
  if (input.createdByCmId) {
    profile_data._crm_meta = {
      created_by_cm_id: String(input.createdByCmId),
      created_by_user_id: input.createdByUserId ? String(input.createdByUserId) : null,
      created_at: new Date().toISOString(),
    };
  }

  const client = getClient();
  try {
    if (input.kind === "intended_parent") {
      const data = await client.execute<{
        insert_intended_parents_one: { id: string | number } | null;
      }>({
        query: INSERT_IP,
        variables: { email, profile_data },
      });
      const id = data.insert_intended_parents_one?.id;
      if (id == null) return { ok: false, error: "insert_failed" };
      return { ok: true, id: String(id) };
    }
    const data = await client.execute<{
      insert_surrogate_mothers_one: { id: string | number } | null;
    }>({
      query: INSERT_SM,
      variables: { email, profile_data },
    });
    const id = data.insert_surrogate_mothers_one?.id;
    if (id == null) return { ok: false, error: "insert_failed" };
    return { ok: true, id: String(id) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[createPartyEntity]", msg);
    if (/unique|duplicate|intended_parents_email_key|surrogate_mothers_email_key/i.test(msg)) {
      return { ok: false, error: "email_taken" };
    }
    return { ok: false, error: "insert_failed" };
  }
}

export function readCreatedByCmId(profileData: unknown): string | null {
  if (!profileData || typeof profileData !== "object" || Array.isArray(profileData)) return null;
  const meta = (profileData as Record<string, unknown>)._crm_meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const id = (meta as Record<string, unknown>).created_by_cm_id;
  return id == null ? null : String(id);
}
