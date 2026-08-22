import { getClient } from "@/config-lib/graphql-client";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import {
  caseDetailWhere,
  type CaseDetailAccessMode,
} from "@/lib/case-manager/fetch-case-detail";
import { resolvePartyEntityId } from "@/lib/party/resolve-party-entity";
import type { CrmSession } from "@/types/portal";

type WriteMode = Extract<CaseDetailAccessMode, "case_manager_api" | "admin_api">;

export const TRUST_CHANGE_TYPES = ["SEED", "CREDIT", "DEBIT", "ADJUSTMENT", "OTHER"] as const;
export type TrustChangeType = (typeof TRUST_CHANGE_TYPES)[number];

export const TRUST_VISIBILITIES = ["all", "manager"] as const;
export type TrustVisibility = (typeof TRUST_VISIBILITIES)[number];

export type TrustLedgerEntry = {
  id: string;
  change_amount: string;
  change_type: string;
  balance_before: string | null;
  balance_after: string | null;
  receiver: string | null;
  remark: string | null;
  voucher_url: string | null;
  visibility: string | null;
  created_at: string;
};

const CASE_TRUST_ROW = `
  query CaseTrustBalance($where: cases_bool_exp!) {
    cases(where: $where, limit: 1) {
      id
      trust_account_balance
    }
  }
`;

const LIST_TRUST_CHANGES = `
  query CaseTrustChanges($caseId: bigint!) {
    trust_account_balance_changes(
      where: { case_cases: { _eq: $caseId } }
      order_by: { created_at: desc }
      limit: 200
    ) {
      id
      change_amount
      change_type
      balance_before
      balance_after
      receiver
      remark
      voucher_url
      visibility
      created_at
    }
  }
`;

const INSERT_TRUST_CHANGE = `
  mutation InsertTrustChange(
    $caseId: bigint!
    $change_amount: numeric!
    $change_type: String!
    $balance_before: numeric
    $balance_after: numeric
    $receiver: String
    $remark: String
    $voucher_url: String
    $visibility: String
  ) {
    insert_trust_account_balance_changes_one(
      object: {
        case_cases: $caseId
        change_amount: $change_amount
        change_type: $change_type
        balance_before: $balance_before
        balance_after: $balance_after
        receiver: $receiver
        remark: $remark
        voucher_url: $voucher_url
        visibility: $visibility
      }
    ) {
      id
    }
  }
`;

const UPDATE_CASE_BALANCE = `
  mutation UpdateCaseTrustBalance($where: cases_bool_exp!, $balance: numeric!) {
    update_cases(where: $where, _set: { trust_account_balance: $balance }) {
      affected_rows
    }
  }
`;

function numStr(v: string | number | null | undefined): string {
  if (v == null) return "0";
  return typeof v === "number" ? String(v) : String(v);
}

function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function scopedWhere(session: CrmSession, caseIdNumeric: bigint, mode: WriteMode) {
  if (mode === "admin_api") return caseDetailWhere(caseIdNumeric, "admin_api", null);
  const cmId = await resolveCaseManagerEntityId(session);
  return caseDetailWhere(caseIdNumeric, "case_manager_api", cmId, session.userId);
}

export async function listTrustLedger(
  session: CrmSession,
  caseIdRaw: string,
  mode: WriteMode,
): Promise<{ balance: string; entries: TrustLedgerEntry[] } | null> {
  if (!/^\d+$/u.test(caseIdRaw)) return null;
  const caseId = BigInt(caseIdRaw);
  const where = await scopedWhere(session, caseId, mode);
  const client = getClient();

  const row = await client.execute<{
    cases: { id: string | number; trust_account_balance: string | number }[];
  }>({ query: CASE_TRUST_ROW, variables: { where } });
  if (!row.cases?.[0]) return null;

  const changes = await client.execute<{
    trust_account_balance_changes: {
      id: string | number;
      change_amount: string | number;
      change_type: string;
      balance_before: string | number | null;
      balance_after: string | number | null;
      receiver: string | null;
      remark: string | null;
      voucher_url: string | null;
      visibility: string | null;
      created_at: string;
    }[];
  }>({ query: LIST_TRUST_CHANGES, variables: { caseId: caseIdRaw } });

  return {
    balance: numStr(row.cases[0].trust_account_balance),
    entries: (changes.trust_account_balance_changes ?? []).map((e) => ({
      id: String(e.id),
      change_amount: numStr(e.change_amount),
      change_type: e.change_type,
      balance_before: e.balance_before == null ? null : numStr(e.balance_before),
      balance_after: e.balance_after == null ? null : numStr(e.balance_after),
      receiver: e.receiver,
      remark: e.remark,
      voucher_url: e.voucher_url,
      visibility: e.visibility,
      created_at: e.created_at,
    })),
  };
}

export type AppendTrustInput = {
  change_amount: number;
  change_type: TrustChangeType;
  receiver?: string;
  remark?: string;
  voucher_url?: string;
  visibility?: TrustVisibility;
};

export type AppendTrustResult =
  | { ok: true; balance: string; entryId: string; wentNegative: boolean }
  | {
      ok: false;
      error:
        | "not_found"
        | "bad_amount"
        | "bad_change_type"
        | "bad_visibility"
        | "update_failed";
    };

/** 登记流水并更新 cases.trust_account_balance（允许结果为负）。 */
export async function appendTrustLedgerEntry(
  session: CrmSession,
  caseIdRaw: string,
  mode: WriteMode,
  input: AppendTrustInput,
): Promise<AppendTrustResult> {
  if (!/^\d+$/u.test(caseIdRaw)) return { ok: false, error: "not_found" };
  if (!TRUST_CHANGE_TYPES.includes(input.change_type)) {
    return { ok: false, error: "bad_change_type" };
  }
  const visibility: TrustVisibility = input.visibility ?? "manager";
  if (!TRUST_VISIBILITIES.includes(visibility)) {
    return { ok: false, error: "bad_visibility" };
  }
  if (!Number.isFinite(input.change_amount) || input.change_amount === 0) {
    return { ok: false, error: "bad_amount" };
  }

  let signed = input.change_amount;
  if (input.change_type === "DEBIT" && signed > 0) signed = -signed;
  if ((input.change_type === "CREDIT" || input.change_type === "SEED") && signed < 0) {
    signed = Math.abs(signed);
  }

  const caseId = BigInt(caseIdRaw);
  const where = await scopedWhere(session, caseId, mode);
  const client = getClient();

  const row = await client.execute<{
    cases: { id: string | number; trust_account_balance: string | number }[];
  }>({ query: CASE_TRUST_ROW, variables: { where } });
  if (!row.cases?.[0]) return { ok: false, error: "not_found" };

  const before = parseAmount(row.cases[0].trust_account_balance) ?? 0;
  const after = Math.round((before + signed) * 100) / 100;
  const wentNegative = after < 0;

  try {
    const inserted = await client.execute<{
      insert_trust_account_balance_changes_one: { id: string | number } | null;
    }>({
      query: INSERT_TRUST_CHANGE,
      variables: {
        caseId: caseIdRaw,
        change_amount: String(signed),
        change_type: input.change_type,
        balance_before: String(before),
        balance_after: String(after),
        receiver: input.receiver?.trim() || null,
        remark: input.remark?.trim() || null,
        voucher_url: input.voucher_url?.trim() || null,
        visibility,
      },
    });
    if (!inserted.insert_trust_account_balance_changes_one) {
      return { ok: false, error: "update_failed" };
    }

    const updated = await client.execute<{
      update_cases: { affected_rows: number | null } | null;
    }>({
      query: UPDATE_CASE_BALANCE,
      variables: { where, balance: String(after) },
    });
    if ((updated.update_cases?.affected_rows ?? 0) < 1) {
      return { ok: false, error: "update_failed" };
    }

    return {
      ok: true,
      balance: String(after),
      entryId: String(inserted.insert_trust_account_balance_changes_one.id),
      wentNegative,
    };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}

const LIST_TRUST_CHANGES_PARTY = `
  query CaseTrustChangesParty($caseId: bigint!) {
    trust_account_balance_changes(
      where: {
        case_cases: { _eq: $caseId }
        visibility: { _eq: "all" }
      }
      order_by: { created_at: desc }
      limit: 200
    ) {
      id
      change_amount
      change_type
      balance_before
      balance_after
      receiver
      remark
      voucher_url
      visibility
      created_at
    }
  }
`;

/** 准父母端：余额 + 仅 visibility=all 的流水（只读）。 */
export async function listPartyVisibleTrustLedger(
  session: CrmSession,
  caseIdRaw: string,
): Promise<{ balance: string; entries: TrustLedgerEntry[] } | null> {
  if (!/^\d+$/u.test(caseIdRaw)) return null;
  const caseId = BigInt(caseIdRaw);
  const partyId = await resolvePartyEntityId("intended_parent", session.userId);
  if (!partyId) return null;
  const where = caseDetailWhere(caseId, "intended_parent_api", null, session.userId, partyId);
  const client = getClient();

  const row = await client.execute<{
    cases: { id: string | number; trust_account_balance: string | number }[];
  }>({ query: CASE_TRUST_ROW, variables: { where } });
  if (!row.cases?.[0]) return null;

  const changes = await client.execute<{
    trust_account_balance_changes: {
      id: string | number;
      change_amount: string | number;
      change_type: string;
      balance_before: string | number | null;
      balance_after: string | number | null;
      receiver: string | null;
      remark: string | null;
      voucher_url: string | null;
      visibility: string | null;
      created_at: string;
    }[];
  }>({ query: LIST_TRUST_CHANGES_PARTY, variables: { caseId: caseIdRaw } });

  return {
    balance: numStr(row.cases[0].trust_account_balance),
    entries: (changes.trust_account_balance_changes ?? []).map((e) => ({
      id: String(e.id),
      change_amount: numStr(e.change_amount),
      change_type: e.change_type,
      balance_before: e.balance_before == null ? null : numStr(e.balance_before),
      balance_after: e.balance_after == null ? null : numStr(e.balance_after),
      receiver: e.receiver,
      remark: e.remark,
      voucher_url: e.voucher_url,
      visibility: e.visibility,
      created_at: e.created_at,
    })),
  };
}
