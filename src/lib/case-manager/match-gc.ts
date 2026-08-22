import { getClient } from "@/config-lib/graphql-client";
import { surrogateDisplayName } from "@/lib/case-manager/display-names";
import { insertCaseGcHistory } from "@/lib/case-manager/case-gc-history";

const MATCH_GC_MUTATION = `
  mutation MatchGcToCase($id: bigint!, $surrogateId: bigint!) {
    update_cases_by_pk(
      pk_columns: { id: $id }
      _set: { surrogate_mother_surrogate_mothers: $surrogateId }
    ) {
      id
      surrogate_mother_surrogate_mothers
    }
  }
`;

const CLEAR_GC_MUTATION = `
  mutation ClearGcFromCase($id: bigint!) {
    update_cases_by_pk(
      pk_columns: { id: $id }
      _set: { surrogate_mother_surrogate_mothers: null }
    ) {
      id
      surrogate_mother_surrogate_mothers
    }
  }
`;

const CASE_GC_QUERY = `
  query CaseCurrentGc($id: bigint!) {
    cases_by_pk(id: $id) {
      id
      surrogate_mother_surrogate_mothers
    }
  }
`;

const AVAILABLE_SURROGATES_QUERY = `
  query SurrogatesAvailableForMatch {
    surrogate_mothers(
      where: { deleted_at: { _is_null: true } }
      order_by: { id: asc }
      limit: 500
    ) {
      id
      email
      profile_data
    }
  }
`;

export type SurrogateOption = { id: string; label: string };

export async function fetchSurrogatesAvailableForMatch(): Promise<SurrogateOption[]> {
  const client = getClient();
  const data = await client.execute<{
    surrogate_mothers: { id: string | number; email: string | null; profile_data: unknown }[];
  }>({ query: AVAILABLE_SURROGATES_QUERY });
  return (data.surrogate_mothers ?? []).map((r) => ({
    id: String(r.id),
    label: `${surrogateDisplayName(r.profile_data, r.email ?? undefined) || "—"} (#${r.id})`,
  }));
}

export type MatchGcResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "already_matched_gc"
        | "bad_surrogate_id"
        | "surrogate_has_case"
        | "update_failed"
        | "same_surrogate"
        | "not_found";
    };

export async function matchGcToCase(caseId: string, surrogateIdRaw: string): Promise<MatchGcResult> {
  if (!/^\d+$/u.test(caseId)) return { ok: false, error: "bad_surrogate_id" };
  const surrogateId = surrogateIdRaw.trim();
  if (!/^\d+$/u.test(surrogateId)) return { ok: false, error: "bad_surrogate_id" };

  const client = getClient();
  try {
    const res = await client.execute<{
      update_cases_by_pk: { id: string | number } | null;
    }>({
      query: MATCH_GC_MUTATION,
      variables: { id: caseId, surrogateId },
    });
    if (!res.update_cases_by_pk) return { ok: false, error: "update_failed" };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (
      message.toLowerCase().includes("cases_surrogate_mother_surrogate_mothers") ||
      (message.toLowerCase().includes("surrogate_mother") && message.toLowerCase().includes("unique"))
    ) {
      return { ok: false, error: "surrogate_has_case" };
    }
    return { ok: false, error: "update_failed" };
  }
}

/**
 * 换绑 GC：先清空当前 FK（旧 GC 立即失权），再绑定空闲 GC，并写入历史。
 */
export async function replaceGcOnCase(
  caseId: string,
  surrogateIdRaw: string,
  opts?: {
    byRole?: string | null;
    byEntityId?: string | null;
    byLabel?: string | null;
    remark?: string;
  },
): Promise<MatchGcResult> {
  if (!/^\d+$/u.test(caseId)) return { ok: false, error: "not_found" };
  const surrogateId = surrogateIdRaw.trim();
  if (!/^\d+$/u.test(surrogateId)) return { ok: false, error: "bad_surrogate_id" };

  const client = getClient();
  const current = await client.execute<{
    cases_by_pk: {
      id: string | number;
      surrogate_mother_surrogate_mothers: string | number | null;
    } | null;
  }>({
    query: CASE_GC_QUERY,
    variables: { id: caseId },
  });
  if (!current.cases_by_pk) return { ok: false, error: "not_found" };

  const prev = current.cases_by_pk.surrogate_mother_surrogate_mothers;
  if (prev != null && String(prev) === surrogateId) {
    return { ok: false, error: "same_surrogate" };
  }

  try {
    if (prev != null) {
      const cleared = await client.execute<{
        update_cases_by_pk: { id: string | number } | null;
      }>({
        query: CLEAR_GC_MUTATION,
        variables: { id: caseId },
      });
      if (!cleared.update_cases_by_pk) return { ok: false, error: "update_failed" };
    }

    const bound = await matchGcToCase(caseId, surrogateId);
    if (!bound.ok && prev != null) {
      try {
        await client.execute({
          query: MATCH_GC_MUTATION,
          variables: { id: caseId, surrogateId: String(prev) },
        });
      } catch {
        /* ignore rollback failure */
      }
      return bound;
    }
    if (bound.ok) {
      try {
        await insertCaseGcHistory({
          caseId,
          fromId: prev == null ? null : String(prev),
          toId: surrogateId,
          byRole: opts?.byRole ?? null,
          byEntityId: opts?.byEntityId ?? null,
          byLabel: opts?.byLabel ?? null,
          remark: opts?.remark,
        });
      } catch {
        /* history failure should not undo successful swap */
      }
    }
    return bound;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (
      message.toLowerCase().includes("cases_surrogate_mother_surrogate_mothers") ||
      (message.toLowerCase().includes("surrogate_mother") && message.toLowerCase().includes("unique"))
    ) {
      return { ok: false, error: "surrogate_has_case" };
    }
    return { ok: false, error: "update_failed" };
  }
}
