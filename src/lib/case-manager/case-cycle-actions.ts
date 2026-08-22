import { getClient } from "@/config-lib/graphql-client";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import {
  caseDetailWhere,
  type CaseCycleRecord,
  type CaseDetailAccessMode,
} from "@/lib/case-manager/fetch-case-detail";
import { parseCyclesFromCaseData, withCyclesInCaseData } from "@/lib/case-manager/case-cycles";
import type { CrmSession } from "@/types/portal";

type WriteMode = Extract<CaseDetailAccessMode, "case_manager_api" | "admin_api">;

const CASE_DATA = `
  query CaseDataForCycles($where: cases_bool_exp!) {
    cases(where: $where, limit: 1) { id data }
  }
`;

const UPDATE_DATA = `
  mutation UpdateCaseDataCycles($where: cases_bool_exp!, $data: json!) {
    update_cases(where: $where, _set: { data: $data }) {
      affected_rows
    }
  }
`;

async function scopedWhere(session: CrmSession, caseId: bigint, mode: WriteMode) {
  if (mode === "admin_api") return caseDetailWhere(caseId, "admin_api", null);
  const cmId = await resolveCaseManagerEntityId(session);
  return caseDetailWhere(caseId, "case_manager_api", cmId, session.userId);
}

function newCycleId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function failCurrentCycleAndStartNew(
  session: CrmSession,
  caseIdRaw: string,
  mode: WriteMode,
  note?: string,
): Promise<
  | { ok: true; cycles: CaseCycleRecord[]; current_cycle_id: string }
  | { ok: false; error: "not_found" | "update_failed" }
> {
  if (!/^\d+$/u.test(caseIdRaw)) return { ok: false, error: "not_found" };
  const where = await scopedWhere(session, BigInt(caseIdRaw), mode);
  const client = getClient();
  const row = await client.execute<{ cases: { id: string | number; data: unknown }[] }>({
    query: CASE_DATA,
    variables: { where },
  });
  if (!row.cases?.[0]) return { ok: false, error: "not_found" };

  const { cycles } = parseCyclesFromCaseData(row.cases[0].data);
  const now = new Date().toISOString();
  const nextCycles = cycles.map((c) =>
    c.status === "active"
      ? { ...c, status: "failed" as const, ended_at: now, note: note?.trim() || c.note }
      : c,
  );
  const fresh: CaseCycleRecord = {
    id: newCycleId(),
    status: "active",
    started_at: now,
    note: note?.trim() || undefined,
  };
  nextCycles.push(fresh);
  const data = withCyclesInCaseData(row.cases[0].data, nextCycles, fresh.id);

  try {
    const updated = await client.execute<{ update_cases: { affected_rows: number | null } | null }>({
      query: UPDATE_DATA,
      variables: { where, data },
    });
    if ((updated.update_cases?.affected_rows ?? 0) < 1) return { ok: false, error: "update_failed" };
    return { ok: true, cycles: nextCycles, current_cycle_id: fresh.id };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}

export async function ensureInitialCycle(
  session: CrmSession,
  caseIdRaw: string,
  mode: WriteMode,
): Promise<{ ok: true; cycles: CaseCycleRecord[]; current_cycle_id: string | null } | { ok: false }> {
  if (!/^\d+$/u.test(caseIdRaw)) return { ok: false };
  const where = await scopedWhere(session, BigInt(caseIdRaw), mode);
  const client = getClient();
  const row = await client.execute<{ cases: { id: string | number; data: unknown }[] }>({
    query: CASE_DATA,
    variables: { where },
  });
  if (!row.cases?.[0]) return { ok: false };
  const parsed = parseCyclesFromCaseData(row.cases[0].data);
  if (parsed.cycles.length > 0) return { ok: true, ...parsed };

  const now = new Date().toISOString();
  const fresh: CaseCycleRecord = { id: newCycleId(), status: "active", started_at: now };
  const data = withCyclesInCaseData(row.cases[0].data, [fresh], fresh.id);
  await client.execute({ query: UPDATE_DATA, variables: { where, data } });
  return { ok: true, cycles: [fresh], current_cycle_id: fresh.id };
}
