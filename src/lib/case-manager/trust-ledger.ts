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
  voucher_urls: string[];
  visibility: string | null;
  occurred_at: string;
  created_at: string;
};

/** 列表最多展示条数；汇算时必须无上限，见 `LIST_TRUST_CHANGES_ASC`。 */
const TRUST_LIST_LIMIT = 500;

const TRUST_ENTRY_FIELDS = `
  id
  change_amount
  change_type
  balance_before
  balance_after
  receiver
  remark
  voucher_urls
  visibility
  occurred_at
  created_at
`;

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
      order_by: [{ occurred_at: desc }, { id: desc }]
      limit: ${TRUST_LIST_LIMIT}
    ) {
      ${TRUST_ENTRY_FIELDS}
    }
  }
`;

/** 汇算用：全量、升序，绝不能带上限。 */
const LIST_TRUST_CHANGES_ASC = `
  query CaseTrustChangesAsc($caseId: bigint!) {
    trust_account_balance_changes(
      where: { case_cases: { _eq: $caseId } }
      order_by: [{ occurred_at: asc }, { id: asc }]
    ) {
      id
      change_amount
    }
  }
`;

const INSERT_TRUST_CHANGE = `
  mutation InsertTrustChange(
    $caseId: bigint!
    $change_amount: numeric!
    $change_type: String!
    $receiver: String
    $remark: String
    $voucher_urls: [String!]
    $visibility: String
    $occurred_at: timestamptz
  ) {
    insert_trust_account_balance_changes_one(
      object: {
        case_cases: $caseId
        change_amount: $change_amount
        change_type: $change_type
        receiver: $receiver
        remark: $remark
        voucher_urls: $voucher_urls
        visibility: $visibility
        occurred_at: $occurred_at
      }
    ) {
      id
    }
  }
`;

/** 原子增减案例余额，返回变更后的值（避免并发读改写丢失）。 */
const INC_CASE_TRUST_BALANCE = `
  mutation IncCaseTrustBalance($where: cases_bool_exp!, $delta: numeric!) {
    update_cases(where: $where, _inc: { trust_account_balance: $delta }) {
      returning {
        id
        trust_account_balance
      }
    }
  }
`;

/** 汇算：一次性重写所有流水的 before/after 并同步案例余额（Hasura 单请求=单事务）。 */
const REBUILD_TRUST_LEDGER = `
  mutation RebuildTrustLedger(
    $updates: [trust_account_balance_changes_updates!]!
    $where: cases_bool_exp!
    $balance: numeric!
  ) {
    update_trust_account_balance_changes_many(updates: $updates) {
      affected_rows
    }
    update_cases(where: $where, _set: { trust_account_balance: $balance }) {
      affected_rows
    }
  }
`;

const UPDATE_TRUST_ENTRY = `
  mutation UpdateTrustChange($id: bigint!, $changes: trust_account_balance_changes_set_input!) {
    update_trust_account_balance_changes_by_pk(pk_columns: { id: $id }, _set: $changes) {
      id
    }
  }
`;

const TRUST_ENTRY_BY_ID = `
  query TrustEntryById($id: bigint!) {
    trust_account_balance_changes_by_pk(id: $id) {
      id
      case_cases
      change_amount
      change_type
    }
  }
`;

const DELETE_TRUST_CHANGE = `
  mutation DeleteTrustChange($id: bigint!) {
    delete_trust_account_balance_changes_by_pk(id: $id) { id }
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 依类型给出带符号金额（DEBIT 取负；CREDIT/SEED 取正）。 */
function signedAmount(magnitude: number, changeType: string): number {
  const abs = Math.abs(magnitude);
  if (changeType === "DEBIT") return -abs;
  if (changeType === "CREDIT" || changeType === "SEED") return abs;
  return magnitude;
}

function normalizeOccurredAt(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function mapEntry(e: {
  id: string | number;
  change_amount: string | number;
  change_type: string;
  balance_before: string | number | null;
  balance_after: string | number | null;
  receiver: string | null;
  remark: string | null;
  voucher_urls: string[] | null;
  visibility: string | null;
  occurred_at: string;
  created_at: string;
}): TrustLedgerEntry {
  return {
    id: String(e.id),
    change_amount: numStr(e.change_amount),
    change_type: e.change_type,
    balance_before: e.balance_before == null ? null : numStr(e.balance_before),
    balance_after: e.balance_after == null ? null : numStr(e.balance_after),
    receiver: e.receiver,
    remark: e.remark,
    voucher_urls: (e.voucher_urls ?? []).filter((u): u is string => typeof u === "string"),
    visibility: e.visibility,
    occurred_at: e.occurred_at,
    created_at: e.created_at,
  };
}

async function scopedWhere(session: CrmSession, caseIdNumeric: bigint, mode: WriteMode) {
  if (mode === "admin_api") return caseDetailWhere(caseIdNumeric, "admin_api", null);
  const cmId = await resolveCaseManagerEntityId(session);
  return caseDetailWhere(caseIdNumeric, "case_manager_api", cmId, session.userId);
}

/**
 * 全量汇算（保持总额不变）：
 *   期初 = finalBalance − Σ(change_amount)
 * 再按 (occurred_at, id) 升序重写每条流水的 before/after。
 * 这样既能把链条修正确，又**不会**改变案例余额，也不会抹掉历史遗留的期初余额。
 */
async function rebuildTrustLedgerWithWhere(
  caseIdRaw: string,
  where: unknown,
  finalBalance: string,
): Promise<{ ok: true; balance: string } | { ok: false; error: "not_found" | "update_failed" }> {
  const client = getClient();

  const list = await client.execute<{
    trust_account_balance_changes: { id: string | number; change_amount: string | number }[];
  }>({ query: LIST_TRUST_CHANGES_ASC, variables: { caseId: caseIdRaw } });

  const rows = list.trust_account_balance_changes ?? [];
  const sum = round2(rows.reduce((acc, e) => acc + (parseAmount(e.change_amount) ?? 0), 0));
  const target = parseAmount(finalBalance) ?? 0;
  let running = round2(target - sum);

  const updates = rows.map((e) => {
    const before = running;
    running = round2(running + (parseAmount(e.change_amount) ?? 0));
    return {
      where: { id: { _eq: String(e.id) } },
      _set: { balance_before: String(before), balance_after: String(running) },
    };
  });

  const balance = rows.length > 0 ? String(running) : String(target);

  try {
    await client.execute({
      query: REBUILD_TRUST_LEDGER,
      variables: { updates, where, balance },
    });
    return { ok: true, balance };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}

/** 对案例余额做原子增减，返回变更后的余额。 */
async function applyCaseBalanceDelta(
  where: unknown,
  delta: number,
): Promise<{ ok: true; balance: string } | { ok: false; error: "not_found" }> {
  const client = getClient();
  const res = await client.execute<{
    update_cases: { returning: { id: string | number; trust_account_balance: string | number }[] };
  }>({
    query: INC_CASE_TRUST_BALANCE,
    variables: { where, delta: String(round2(delta)) },
  });
  const row = res.update_cases?.returning?.[0];
  if (!row) return { ok: false, error: "not_found" };
  return { ok: true, balance: numStr(row.trust_account_balance) };
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
    trust_account_balance_changes: Parameters<typeof mapEntry>[0][];
  }>({ query: LIST_TRUST_CHANGES, variables: { caseId: caseIdRaw } });

  return {
    balance: numStr(row.cases[0].trust_account_balance),
    entries: (changes.trust_account_balance_changes ?? []).map(mapEntry),
  };
}

export type AppendTrustInput = {
  change_amount: number;
  change_type: TrustChangeType;
  receiver?: string;
  remark?: string;
  voucher_urls?: string[];
  visibility?: TrustVisibility;
  occurred_at?: string;
};

export type AppendTrustResult =
  | { ok: true; balance: string; entryId: string; wentNegative: boolean }
  | {
      ok: false;
      error: "not_found" | "bad_amount" | "bad_change_type" | "bad_visibility" | "update_failed";
    };

/** 登记流水（金额填绝对值即可）；先原子增减案例余额，再全量汇算，总额不会被改动。 */
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

  const signed = signedAmount(input.change_amount, input.change_type);
  const caseId = BigInt(caseIdRaw);
  const where = await scopedWhere(session, caseId, mode);
  const client = getClient();

  const access = await client.execute<{ cases: { id: string | number }[] }>({
    query: CASE_TRUST_ROW,
    variables: { where },
  });
  if (!access.cases?.[0]) return { ok: false, error: "not_found" };

  try {
    const inserted = await client.execute<{
      insert_trust_account_balance_changes_one: { id: string | number } | null;
    }>({
      query: INSERT_TRUST_CHANGE,
      variables: {
        caseId: caseIdRaw,
        change_amount: String(signed),
        change_type: input.change_type,
        receiver: input.receiver?.trim() || null,
        remark: input.remark?.trim() || null,
        voucher_urls: input.voucher_urls ?? [],
        visibility,
        // 列是 NOT NULL：未填时用「现在」对齐 DB 默认值 now()，不能显式传 NULL。
        occurred_at: normalizeOccurredAt(input.occurred_at) ?? new Date().toISOString(),
      },
    });
    const entryId = inserted.insert_trust_account_balance_changes_one?.id;
    if (entryId == null) return { ok: false, error: "update_failed" };

    const bumped = await applyCaseBalanceDelta(where, signed);
    if (!bumped.ok) return { ok: false, error: "update_failed" };

    const rebuilt = await rebuildTrustLedgerWithWhere(caseIdRaw, where, bumped.balance);
    if (!rebuilt.ok) return { ok: false, error: "update_failed" };

    const balanceNum = parseAmount(rebuilt.balance);
    return {
      ok: true,
      balance: rebuilt.balance,
      entryId: String(entryId),
      wentNegative: balanceNum != null && balanceNum < 0,
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
      order_by: [{ occurred_at: desc }, { id: desc }]
      limit: ${TRUST_LIST_LIMIT}
    ) {
      ${TRUST_ENTRY_FIELDS}
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
    trust_account_balance_changes: Parameters<typeof mapEntry>[0][];
  }>({ query: LIST_TRUST_CHANGES_PARTY, variables: { caseId: caseIdRaw } });

  return {
    balance: numStr(row.cases[0].trust_account_balance),
    entries: (changes.trust_account_balance_changes ?? []).map(mapEntry),
  };
}

export type UpdateTrustEntryInput = {
  entryId: string;
  receiver?: string | null;
  remark?: string | null;
  voucher_urls?: string[] | null;
  visibility?: TrustVisibility;
  /** 允许更正类型（填错可改） */
  change_type?: TrustChangeType;
  /** 允许更正金额（填绝对值，符号由类型决定） */
  change_amount?: number | null;
  /** 业务发生时间（可手填） */
  occurred_at?: string | null;
};

export type UpdateTrustEntryResult =
  | { ok: true }
  | {
      ok: false;
      error: "not_found" | "bad_visibility" | "bad_change_type" | "bad_amount" | "update_failed";
    };

/** 更正流水：金额 / 类型 / 时间 / 元数据；按差额调账后全量汇算。 */
export async function updateTrustLedgerEntry(
  session: CrmSession,
  caseIdRaw: string,
  mode: WriteMode,
  input: UpdateTrustEntryInput,
): Promise<UpdateTrustEntryResult> {
  if (!/^\d+$/u.test(caseIdRaw) || !/^\d+$/u.test(input.entryId)) {
    return { ok: false, error: "not_found" };
  }
  if (input.visibility != null && !TRUST_VISIBILITIES.includes(input.visibility)) {
    return { ok: false, error: "bad_visibility" };
  }
  if (input.change_type != null && !TRUST_CHANGE_TYPES.includes(input.change_type)) {
    return { ok: false, error: "bad_change_type" };
  }
  if (input.change_amount != null && (!Number.isFinite(input.change_amount) || input.change_amount === 0)) {
    return { ok: false, error: "bad_amount" };
  }

  const caseId = BigInt(caseIdRaw);
  const where = await scopedWhere(session, caseId, mode);
  const client = getClient();

  const row = await client.execute<{ cases: { id: string | number }[] }>({
    query: CASE_TRUST_ROW,
    variables: { where },
  });
  if (!row.cases?.[0]) return { ok: false, error: "not_found" };

  const entry = await client.execute<{
    trust_account_balance_changes_by_pk: {
      id: string | number;
      case_cases: string | number;
      change_amount: string | number;
      change_type: string;
    } | null;
  }>({ query: TRUST_ENTRY_BY_ID, variables: { id: input.entryId } });

  const found = entry.trust_account_balance_changes_by_pk;
  if (!found || String(found.case_cases) !== caseIdRaw) {
    return { ok: false, error: "not_found" };
  }

  const oldSigned = parseAmount(found.change_amount) ?? 0;
  const nextType = input.change_type ?? found.change_type;
  let nextSigned = oldSigned;
  if (input.change_amount != null) {
    nextSigned = signedAmount(input.change_amount, nextType);
  } else if (input.change_type !== undefined) {
    nextSigned = signedAmount(Math.abs(oldSigned), nextType);
  }
  const delta = round2(nextSigned - oldSigned);

  const changes: Record<string, unknown> = {};
  if (input.receiver !== undefined) changes.receiver = input.receiver?.trim() || null;
  if (input.remark !== undefined) changes.remark = input.remark?.trim() || null;
  if (input.voucher_urls !== undefined) changes.voucher_urls = input.voucher_urls ?? [];
  if (input.visibility !== undefined) changes.visibility = input.visibility;
  if (input.change_type !== undefined) changes.change_type = input.change_type;
  if (delta !== 0) changes.change_amount = String(nextSigned);
  if (input.occurred_at !== undefined) {
    // 列是 NOT NULL：清空视为「不改」，避免写成 NULL 报错。
    const oc = normalizeOccurredAt(input.occurred_at);
    if (oc) changes.occurred_at = oc;
  }

  if (Object.keys(changes).length === 0) return { ok: true };

  try {
    const updated = await client.execute<{
      update_trust_account_balance_changes_by_pk: { id: string | number } | null;
    }>({ query: UPDATE_TRUST_ENTRY, variables: { id: input.entryId, changes } });
    if (!updated.update_trust_account_balance_changes_by_pk) {
      return { ok: false, error: "update_failed" };
    }

    let balance: string | null = null;
    if (delta !== 0) {
      const bumped = await applyCaseBalanceDelta(where, delta);
      if (!bumped.ok) return { ok: false, error: "update_failed" };
      balance = bumped.balance;
    }

    if (balance == null) {
      const cur = await client.execute<{
        cases: { trust_account_balance: string | number }[];
      }>({ query: CASE_TRUST_ROW, variables: { where } });
      balance = numStr(cur.cases?.[0]?.trust_account_balance);
    }

    const rebuilt = await rebuildTrustLedgerWithWhere(caseIdRaw, where, balance);
    if (!rebuilt.ok) return { ok: false, error: "update_failed" };
    return { ok: true };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}

/** 删除流水：按差额调账后全量汇算。 */
export async function deleteTrustLedgerEntry(
  session: CrmSession,
  caseIdRaw: string,
  mode: WriteMode,
  entryId: string,
): Promise<{ ok: true; balance: string } | { ok: false; error: "not_found" | "update_failed" }> {
  if (!/^\d+$/u.test(caseIdRaw) || !/^\d+$/u.test(entryId)) {
    return { ok: false, error: "not_found" };
  }
  const caseId = BigInt(caseIdRaw);
  const where = await scopedWhere(session, caseId, mode);
  const client = getClient();

  const row = await client.execute<{ cases: { id: string | number }[] }>({
    query: CASE_TRUST_ROW,
    variables: { where },
  });
  if (!row.cases?.[0]) return { ok: false, error: "not_found" };

  const entry = await client.execute<{
    trust_account_balance_changes_by_pk: {
      id: string | number;
      case_cases: string | number;
      change_amount: string | number;
    } | null;
  }>({ query: TRUST_ENTRY_BY_ID, variables: { id: entryId } });

  const found = entry.trust_account_balance_changes_by_pk;
  if (!found || String(found.case_cases) !== caseIdRaw) {
    return { ok: false, error: "not_found" };
  }

  const removal = parseAmount(found.change_amount) ?? 0;

  try {
    const deleted = await client.execute<{
      delete_trust_account_balance_changes_by_pk: { id: string | number } | null;
    }>({ query: DELETE_TRUST_CHANGE, variables: { id: entryId } });
    if (!deleted.delete_trust_account_balance_changes_by_pk) {
      return { ok: false, error: "update_failed" };
    }

    const bumped = await applyCaseBalanceDelta(where, -removal);
    if (!bumped.ok) return { ok: false, error: "update_failed" };

    const rebuilt = await rebuildTrustLedgerWithWhere(caseIdRaw, where, bumped.balance);
    if (!rebuilt.ok) return { ok: false, error: "update_failed" };
    return { ok: true, balance: rebuilt.balance };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}
