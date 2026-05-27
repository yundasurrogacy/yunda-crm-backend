import { NextResponse } from "next/server";
import { getClient } from "@/config-lib/graphql-client";
import { CANONICAL_CASE_STAGES, isCanonicalCaseStage } from "@/constants/case-stages";
import { getServerSession } from "@/lib/auth/session-cookie";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import { intendedParentDisplay } from "@/lib/case-manager/display-names";
import { fetchSurrogatesAvailableForMatch } from "@/lib/case-manager/match-gc";

const OPTIONS_QUERY = `
  query CmCreateCaseOptions($where: intended_parents_bool_exp!) {
    intended_parents(where: $where, order_by: { id: asc }, limit: 500) {
      id
      email
      profile_data
    }
  }
`;

const CREATE_CASE_MUTATION = `
  mutation CmCreateCase(
    $caseManagerId: bigint!
    $intendedParentId: bigint!
    $processStatus: String!
    $trustAccountBalance: numeric!
    $data: json!
  ) {
    insert_cases_one(
      object: {
        case_manager_case_managers: $caseManagerId
        intended_parent_intended_parents: $intendedParentId
        process_status: $processStatus
        trust_account_balance: $trustAccountBalance
        data: $data
      }
    ) {
      id
    }
  }
`;

const EMPTY_CASE_DATA = { v: 1, byStage: {} as Record<string, Record<string, string>> };

function parseId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return /^\d+$/u.test(t) ? t : null;
}

function classifyInsertError(message: string): "intended_parent_has_case" | "unknown" {
  const m = message.toLowerCase();
  if (
    m.includes("cases_intended_parent_intended_parents") ||
    (m.includes("intended_parent") && m.includes("unique"))
  ) {
    return "intended_parent_has_case";
  }
  return "unknown";
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const optionsType = searchParams.get("options");
  try {
    const client = getClient();
    if (optionsType === "1") {
      const data = await client.execute<{
        intended_parents: { id: string | number; email: string | null; profile_data: unknown }[];
      }>({
        query: OPTIONS_QUERY,
        variables: { where: { _not: { cases: {} } } },
      });
      return NextResponse.json({
        intendedParents: (data.intended_parents ?? []).map((r) => ({
          id: String(r.id),
          label: `${intendedParentDisplay(r.profile_data, r.email ?? undefined) || "—"} (#${r.id})`,
        })),
        defaultStage: CANONICAL_CASE_STAGES[0],
      });
    }
    if (optionsType === "gc") {
      const surrogates = await fetchSurrogatesAvailableForMatch();
      return NextResponse.json({ surrogates });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

type CreateCaseBody = {
  intendedParentId: string;
  processStatus?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const caseManagerId = await resolveCaseManagerEntityId(session);
  if (!caseManagerId) {
    return NextResponse.json({ error: "case_manager_not_bound" }, { status: 403 });
  }
  let body: CreateCaseBody;
  try {
    body = (await req.json()) as CreateCaseBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const intendedParentId = parseId(body.intendedParentId);
  if (!intendedParentId) {
    return NextResponse.json({ error: "bad_ids" }, { status: 400 });
  }
  const stage = body.processStatus?.trim() || CANONICAL_CASE_STAGES[0];
  if (!isCanonicalCaseStage(stage)) {
    return NextResponse.json({ error: "bad_stage" }, { status: 400 });
  }
  try {
    const client = getClient();
    const data = await client.execute<{ insert_cases_one: { id: string | number } | null }>({
      query: CREATE_CASE_MUTATION,
      variables: {
        caseManagerId,
        intendedParentId,
        processStatus: stage,
        trustAccountBalance: "0",
        data: EMPTY_CASE_DATA,
      },
    });
    const id = data.insert_cases_one?.id;
    if (id == null) {
      return NextResponse.json({ error: "create_failed", reason: "no_row_returned" }, { status: 500 });
    }
    return NextResponse.json({ id: String(id) }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const kind = classifyInsertError(message);
    if (kind === "intended_parent_has_case") {
      return NextResponse.json({ error: "intended_parent_has_case", detail: message }, { status: 409 });
    }
    return NextResponse.json({ error: "create_failed", detail: message }, { status: 500 });
  }
}
