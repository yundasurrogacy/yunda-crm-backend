import { getClient } from "@/config-lib/graphql-client";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import {
  caseDetailWhere,
  type CaseDetailAccessMode,
} from "@/lib/case-manager/fetch-case-detail";
import { resolvePartyEntityId } from "@/lib/party/resolve-party-entity";
import type { CrmSession } from "@/types/portal";

type WriteMode = Extract<CaseDetailAccessMode, "case_manager_api" | "admin_api">;

export const CASE_FILE_CATEGORIES = [
  "EmbryoDocs",
  "SurrogateInfo",
  "LegalDocs",
  "EscrowLegalContract",
  "PrenatalReport",
  "Photo",
  "Other",
] as const;
export type CaseFileCategory = (typeof CASE_FILE_CATEGORIES)[number];

export const CASE_FILE_ABOUT_ROLES = ["intended_parent", "surrogate_mother"] as const;
export type CaseFileAboutRole = (typeof CASE_FILE_ABOUT_ROLES)[number];

export const CASE_FILE_VISIBILITIES = ["all", "manager"] as const;
export type CaseFileVisibility = (typeof CASE_FILE_VISIBILITIES)[number];

export type CaseFileRow = {
  id: string;
  category: string;
  about_role: string | null;
  file_type: string | null;
  file_url: string | null;
  note: string | null;
  visibility: string | null;
  created_at: string;
};

const CASE_ACCESS = `
  query CaseFilesAccess($where: cases_bool_exp!) {
    cases(where: $where, limit: 1) {
      id
    }
  }
`;

const LIST_FILES = `
  query CaseFilesList($caseId: bigint!, $where: cases_files_bool_exp!) {
    cases_files(
      where: { _and: [{ case_cases: { _eq: $caseId } }, $where] }
      order_by: { created_at: desc }
      limit: 200
    ) {
      id
      category
      about_role
      file_type
      file_url
      note
      visibility
      created_at
    }
  }
`;

const INSERT_FILE = `
  mutation InsertCaseFile(
    $caseId: bigint!
    $category: String!
    $about_role: String
    $file_type: String
    $file_url: String
    $note: String
    $visibility: String
  ) {
    insert_cases_files_one(
      object: {
        case_cases: $caseId
        category: $category
        about_role: $about_role
        file_type: $file_type
        file_url: $file_url
        note: $note
        visibility: $visibility
      }
    ) {
      id
    }
  }
`;

async function scopedWhere(session: CrmSession, caseIdNumeric: bigint, mode: WriteMode) {
  if (mode === "admin_api") return caseDetailWhere(caseIdNumeric, "admin_api", null);
  const cmId = await resolveCaseManagerEntityId(session);
  return caseDetailWhere(caseIdNumeric, "case_manager_api", cmId, session.userId);
}

async function assertCaseAccess(
  session: CrmSession,
  caseIdRaw: string,
  mode: WriteMode,
): Promise<boolean> {
  if (!/^\d+$/u.test(caseIdRaw)) return false;
  const where = await scopedWhere(session, BigInt(caseIdRaw), mode);
  const client = getClient();
  const row = await client.execute<{ cases: { id: string | number }[] }>({
    query: CASE_ACCESS,
    variables: { where },
  });
  return Boolean(row.cases?.[0]);
}

function mapFiles(
  rows: {
    id: string | number;
    category: string;
    about_role: string | null;
    file_type: string | null;
    file_url: string | null;
    note: string | null;
    visibility: string | null;
    created_at: string;
  }[],
): CaseFileRow[] {
  return rows.map((f) => ({
    id: String(f.id),
    category: f.category,
    about_role: f.about_role,
    file_type: f.file_type,
    file_url: f.file_url,
    note: f.note,
    visibility: f.visibility,
    created_at: f.created_at,
  }));
}

export async function listCaseFiles(
  session: CrmSession,
  caseIdRaw: string,
  mode: WriteMode,
): Promise<CaseFileRow[] | null> {
  if (!(await assertCaseAccess(session, caseIdRaw, mode))) return null;
  const client = getClient();
  const data = await client.execute<{
    cases_files: {
      id: string | number;
      category: string;
      about_role: string | null;
      file_type: string | null;
      file_url: string | null;
      note: string | null;
      visibility: string | null;
      created_at: string;
    }[];
  }>({
    query: LIST_FILES,
    variables: { caseId: caseIdRaw, where: {} },
  });
  return mapFiles(data.cases_files ?? []);
}

/** 门户：仅 visibility=all 的附件 */
export async function listCaseFilesForParty(
  session: CrmSession,
  caseIdRaw: string,
  mode: Extract<CaseDetailAccessMode, "intended_parent_api" | "surrogate_mother_api">,
): Promise<CaseFileRow[] | null> {
  if (!/^\d+$/u.test(caseIdRaw)) return null;
  const partyEntityId = await resolvePartyEntityId(
    mode === "intended_parent_api" ? "intended_parent" : "surrogate_mother",
    session.userId,
  );
  if (!partyEntityId) return null;
  const where = caseDetailWhere(BigInt(caseIdRaw), mode, null, session.userId, partyEntityId);
  const client = getClient();
  const access = await client.execute<{ cases: { id: string | number }[] }>({
    query: CASE_ACCESS,
    variables: { where },
  });
  if (!access.cases?.[0]) return null;

  const data = await client.execute<{
    cases_files: {
      id: string | number;
      category: string;
      about_role: string | null;
      file_type: string | null;
      file_url: string | null;
      note: string | null;
      visibility: string | null;
      created_at: string;
    }[];
  }>({
    query: LIST_FILES,
    variables: { caseId: caseIdRaw, where: { visibility: { _eq: "all" } } },
  });
  return mapFiles(data.cases_files ?? []);
}

export type AddCaseFileInput = {
  category: CaseFileCategory;
  file_url: string;
  about_role?: CaseFileAboutRole | null;
  file_type?: string | null;
  note?: string | null;
  visibility?: CaseFileVisibility;
};

export async function addCaseFile(
  session: CrmSession,
  caseIdRaw: string,
  mode: WriteMode,
  input: AddCaseFileInput,
): Promise<{ ok: true; id: string } | { ok: false; error: "not_found" | "bad_input" | "insert_failed" }> {
  if (!CASE_FILE_CATEGORIES.includes(input.category)) {
    return { ok: false, error: "bad_input" };
  }
  const url = input.file_url.trim();
  if (!url) return { ok: false, error: "bad_input" };
  if (input.about_role && !CASE_FILE_ABOUT_ROLES.includes(input.about_role)) {
    return { ok: false, error: "bad_input" };
  }
  const visibility: CaseFileVisibility = input.visibility ?? "all";
  if (!CASE_FILE_VISIBILITIES.includes(visibility)) {
    return { ok: false, error: "bad_input" };
  }
  if (!(await assertCaseAccess(session, caseIdRaw, mode))) {
    return { ok: false, error: "not_found" };
  }
  try {
    const client = getClient();
    const inserted = await client.execute<{
      insert_cases_files_one: { id: string | number } | null;
    }>({
      query: INSERT_FILE,
      variables: {
        caseId: caseIdRaw,
        category: input.category,
        about_role: input.about_role ?? null,
        file_type: input.file_type?.trim() || null,
        file_url: url,
        note: input.note?.trim() || null,
        visibility,
      },
    });
    if (!inserted.insert_cases_files_one) return { ok: false, error: "insert_failed" };
    return { ok: true, id: String(inserted.insert_cases_files_one.id) };
  } catch {
    return { ok: false, error: "insert_failed" };
  }
}

const FILE_BY_ID = `
  query CaseFileById($id: bigint!) {
    cases_files_by_pk(id: $id) {
      id
      case_cases
    }
  }
`;

const DELETE_FILE = `
  mutation DeleteCaseFile($id: bigint!) {
    delete_cases_files_by_pk(id: $id) { id }
  }
`;

export async function deleteCaseFile(
  session: CrmSession,
  caseIdRaw: string,
  mode: WriteMode,
  fileId: string,
): Promise<{ ok: true } | { ok: false; error: "not_found" | "delete_failed" }> {
  if (!/^\d+$/u.test(caseIdRaw) || !/^\d+$/u.test(fileId)) {
    return { ok: false, error: "not_found" };
  }
  if (!(await assertCaseAccess(session, caseIdRaw, mode))) {
    return { ok: false, error: "not_found" };
  }
  const client = getClient();
  try {
    const found = await client.execute<{
      cases_files_by_pk: { id: string | number; case_cases: string | number } | null;
    }>({ query: FILE_BY_ID, variables: { id: fileId } });
    if (!found.cases_files_by_pk || String(found.cases_files_by_pk.case_cases) !== caseIdRaw) {
      return { ok: false, error: "not_found" };
    }
    const deleted = await client.execute<{
      delete_cases_files_by_pk: { id: string | number } | null;
    }>({ query: DELETE_FILE, variables: { id: fileId } });
    if (!deleted.delete_cases_files_by_pk) return { ok: false, error: "delete_failed" };
    return { ok: true };
  } catch {
    return { ok: false, error: "delete_failed" };
  }
}
