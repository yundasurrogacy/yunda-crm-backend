import { getClient } from "@/config-lib/graphql-client";
import { surrogateDisplayName } from "@/lib/case-manager/display-names";

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

const AVAILABLE_SURROGATES_QUERY = `
  query SurrogatesAvailableForMatch {
    surrogate_mothers(
      where: { _not: { cases: {} } }
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
  | { ok: false; error: "already_matched_gc" | "bad_surrogate_id" | "surrogate_has_case" | "update_failed" };

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
