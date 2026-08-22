import { getClient } from "@/config-lib/graphql-client";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import {
  caseDetailWhere,
  type CaseDetailAccessMode,
} from "@/lib/case-manager/fetch-case-detail";
import type { CrmSession } from "@/types/portal";

type AccessMode = CaseDetailAccessMode;

export type CaseMessageRow = {
  id: string;
  author_role: string;
  author_entity_id: string | null;
  author_label: string | null;
  body: string;
  email_notify: boolean;
  created_at: string;
};

const LIST_MESSAGES = `
  query CaseMessages($caseId: bigint!) {
    case_messages(
      where: { case_cases: { _eq: $caseId } }
      order_by: { created_at: asc }
      limit: 200
    ) {
      id
      author_role
      author_entity_id
      author_label
      body
      email_notify
      created_at
    }
  }
`;

const INSERT_MESSAGE = `
  mutation InsertCaseMessage(
    $caseId: bigint!
    $authorRole: String!
    $authorEntityId: bigint
    $authorLabel: String
    $body: String!
    $emailNotify: Boolean!
  ) {
    insert_case_messages_one(
      object: {
        case_cases: $caseId
        author_role: $authorRole
        author_entity_id: $authorEntityId
        author_label: $authorLabel
        body: $body
        email_notify: $emailNotify
      }
    ) {
      id
    }
  }
`;

async function assertAccess(
  session: CrmSession,
  caseIdRaw: string,
  mode: AccessMode,
): Promise<boolean> {
  if (!/^\d+$/u.test(caseIdRaw)) return false;
  let partyEntityId: string | null = null;
  let cmId: string | null = null;
  if (mode === "case_manager_api") {
    cmId = await resolveCaseManagerEntityId(session);
  }
  if (mode === "intended_parent_api" || mode === "surrogate_mother_api") {
    const { resolvePartyEntityId } = await import("@/lib/party/resolve-party-entity");
    partyEntityId = await resolvePartyEntityId(
      mode === "intended_parent_api" ? "intended_parent" : "surrogate_mother",
      session.userId,
    );
    if (!partyEntityId) return false;
  }
  const where = caseDetailWhere(
    BigInt(caseIdRaw),
    mode,
    cmId,
    session.userId,
    partyEntityId,
  );
  const client = getClient();
  const row = await client.execute<{ cases: { id: string | number }[] }>({
    query: `query MsgCaseAccess($where: cases_bool_exp!) { cases(where: $where, limit: 1) { id } }`,
    variables: { where },
  });
  return Boolean(row.cases?.[0]);
}

async function resolveAuthorEntityId(
  session: CrmSession,
  mode: AccessMode,
): Promise<string | null> {
  if (mode === "admin_api") return null;
  if (mode === "case_manager_api") {
    return resolveCaseManagerEntityId(session);
  }
  if (mode === "intended_parent_api" || mode === "surrogate_mother_api") {
    const { resolvePartyEntityId } = await import("@/lib/party/resolve-party-entity");
    return resolvePartyEntityId(
      mode === "intended_parent_api" ? "intended_parent" : "surrogate_mother",
      session.userId,
    );
  }
  return null;
}

export async function listCaseMessages(
  session: CrmSession,
  caseIdRaw: string,
  mode: AccessMode,
): Promise<CaseMessageRow[] | null> {
  if (!(await assertAccess(session, caseIdRaw, mode))) return null;
  const client = getClient();
  const data = await client.execute<{
    case_messages: {
      id: string | number;
      author_role: string;
      author_entity_id: string | number | null;
      author_label: string | null;
      body: string;
      email_notify: boolean;
      created_at: string;
    }[];
  }>({
    query: LIST_MESSAGES,
    variables: { caseId: caseIdRaw },
  });
  return (data.case_messages ?? []).map((m) => ({
    id: String(m.id),
    author_role: m.author_role,
    author_entity_id: m.author_entity_id == null ? null : String(m.author_entity_id),
    author_label: m.author_label?.trim() || null,
    body: m.body,
    email_notify: Boolean(m.email_notify),
    created_at: m.created_at,
  }));
}

export async function postCaseMessage(
  session: CrmSession,
  caseIdRaw: string,
  mode: AccessMode,
  input: { body: string; email_notify?: boolean; author_role: string },
): Promise<{ ok: true; id: string } | { ok: false; error: "not_found" | "bad_body" | "insert_failed" }> {
  const body = input.body.trim();
  if (!body || body.length > 4000) return { ok: false, error: "bad_body" };
  if (!(await assertAccess(session, caseIdRaw, mode))) return { ok: false, error: "not_found" };
  try {
    const authorEntityId = await resolveAuthorEntityId(session, mode);
    const client = getClient();
    const inserted = await client.execute<{
      insert_case_messages_one: { id: string | number } | null;
    }>({
      query: INSERT_MESSAGE,
      variables: {
        caseId: caseIdRaw,
        authorRole: input.author_role,
        authorEntityId,
        authorLabel: session.email?.trim() || null,
        body,
        emailNotify: Boolean(input.email_notify),
      },
    });
    if (!inserted.insert_case_messages_one) return { ok: false, error: "insert_failed" };
    // email_notify 标记已存；实际发信基建后续接
    return { ok: true, id: String(inserted.insert_case_messages_one.id) };
  } catch {
    return { ok: false, error: "insert_failed" };
  }
}
