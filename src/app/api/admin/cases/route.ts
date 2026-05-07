import { NextResponse } from "next/server";
import { getClient } from "@/config-lib/graphql-client";
import { CANONICAL_CASE_STAGES, isCanonicalCaseStage, type CanonicalCaseStage } from "@/constants/case-stages";
import {
  fetchCasesPage,
  fetchStageCounts,
  type CasesListScope,
} from "@/lib/case-manager/fetch-dashboard-data";
import { getServerSession } from "@/lib/auth/session-cookie";
import { intendedParentDisplay, surrogateDisplayName } from "@/lib/case-manager/display-names";

const ADMIN_SCOPE = "admin_all" satisfies CasesListScope;

/** 解析 Hasura / Postgres 唯一约束错误，便于前端展示明确原因 */
function classifyCaseInsertError(message: string): "intended_parent_has_case" | "surrogate_has_case" | "unknown" {
  const m = message.toLowerCase();
  if (
    m.includes("cases_intended_parent_intended_parents") ||
    (m.includes("intended_parent") && m.includes("unique"))
  ) {
    return "intended_parent_has_case";
  }
  if (
    m.includes("cases_surrogate_mother_surrogate_mothers") ||
    (m.includes("surrogate_mother") && m.includes("unique"))
  ) {
    return "surrogate_has_case";
  }
  return "unknown";
}

const OPTIONS_QUERY = `
  query AdminCaseOptions {
    case_managers(order_by: { id: asc }, limit: 500) {
      id
      user {
        email
      }
    }
    intended_parents(order_by: { id: asc }, limit: 500) {
      id
      email
      contact_information
    }
    surrogate_mothers(order_by: { id: asc }, limit: 500) {
      id
      email
      contact_information
    }
  }
`;

const CREATE_CASE_MUTATION = `
  mutation AdminCreateCase(
    $caseManagerId: bigint!
    $intendedParentId: bigint!
    $surrogateId: bigint!
    $processStatus: String!
    $trustAccountBalance: numeric!
    $data: json!
  ) {
    insert_cases_one(
      object: {
        case_manager_case_managers: $caseManagerId
        intended_parent_intended_parents: $intendedParentId
        surrogate_mother_surrogate_mothers: $surrogateId
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

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  if (searchParams.get("options") === "1") {
    try {
      const client = getClient();
      const data = await client.execute<{
        case_managers: { id: string | number; user: { email: string | null } | null }[];
        intended_parents: { id: string | number; email: string | null; contact_information: unknown }[];
        surrogate_mothers: { id: string | number; email: string | null; contact_information: unknown }[];
      }>({
        query: OPTIONS_QUERY,
      });
      return NextResponse.json({
        caseManagers: (data.case_managers ?? []).map((r) => ({
          id: String(r.id),
          label: `${r.user?.email?.trim() || "—"} (#${r.id})`,
        })),
        intendedParents: (data.intended_parents ?? []).map((r) => ({
          id: String(r.id),
          label: `${intendedParentDisplay(r.contact_information, r.email ?? undefined) || "—"} (#${r.id})`,
        })),
        surrogates: (data.surrogate_mothers ?? []).map((r) => ({
          id: String(r.id),
          label: `${surrogateDisplayName(r.contact_information) || r.email?.trim() || "—"} (#${r.id})`,
        })),
      });
    } catch {
      return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
    }
  }

  const stageRaw = searchParams.get("stage");
  const allStagesScope = stageRaw === "all";
  let stage = stageRaw ?? CANONICAL_CASE_STAGES[0];
  if (allStagesScope) {
    stage = "all";
  } else if (!isCanonicalCaseStage(stage)) {
    stage = CANONICAL_CASE_STAGES[0];
  }
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10) || 10));
  const skipCounts = searchParams.get("counts") === "0";
  const filters = {
    q: searchParams.get("q") ?? undefined,
    processStatus: searchParams.get("processStatus") ?? undefined,
    caseManagerId: searchParams.get("caseManagerId") ?? undefined,
    intendedParentId: searchParams.get("intendedParentId") ?? undefined,
    surrogateId: searchParams.get("surrogateId") ?? undefined,
  };
  try {
    if (skipCounts || allStagesScope) {
      const list = await fetchCasesPage(
        session,
        stage as CanonicalCaseStage | "all",
        page,
        pageSize,
        filters,
        ADMIN_SCOPE,
      );
      return NextResponse.json({ stage, counts: null, ...list, page, pageSize });
    }
    const [counts, list] = await Promise.all([
      fetchStageCounts(session, ADMIN_SCOPE),
      fetchCasesPage(session, stage as CanonicalCaseStage, page, pageSize, filters, ADMIN_SCOPE),
    ]);
    return NextResponse.json({ stage, counts, ...list, page, pageSize });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

type CreateCaseBody = {
  caseManagerId: string;
  intendedParentId: string;
  surrogateId: string;
  processStatus: string;
  trustAccountBalance: string;
};

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: CreateCaseBody;
  try {
    body = (await req.json()) as CreateCaseBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const caseManagerId = parseId(body.caseManagerId);
  const intendedParentId = parseId(body.intendedParentId);
  const surrogateId = parseId(body.surrogateId);
  if (!caseManagerId || !intendedParentId || !surrogateId) {
    return NextResponse.json({ error: "bad_ids" }, { status: 400 });
  }
  if (!isCanonicalCaseStage(body.processStatus)) {
    return NextResponse.json({ error: "bad_stage" }, { status: 400 });
  }
  const balRaw = body.trustAccountBalance?.trim() ?? "";
  if (!/^-?\d+(\.\d+)?$/u.test(balRaw)) {
    return NextResponse.json({ error: "bad_balance" }, { status: 400 });
  }
  try {
    const client = getClient();
    const data = await client.execute<{ insert_cases_one: { id: string | number } | null }>({
      query: CREATE_CASE_MUTATION,
      variables: {
        caseManagerId,
        intendedParentId,
        surrogateId,
        processStatus: body.processStatus,
        trustAccountBalance: balRaw,
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
    const kind = classifyCaseInsertError(message);
    if (kind === "intended_parent_has_case") {
      return NextResponse.json({ error: "intended_parent_has_case", detail: message }, { status: 409 });
    }
    if (kind === "surrogate_has_case") {
      return NextResponse.json({ error: "surrogate_has_case", detail: message }, { status: 409 });
    }
    console.error("[admin/cases POST]", message);
    return NextResponse.json({ error: "create_failed", detail: message }, { status: 500 });
  }
}
