import { NextResponse } from "next/server";
import { getClient } from "@/config-lib/graphql-client";
import { caseManagerCanAccessCase } from "@/lib/case-manager/case-access";
import { matchGcToCase } from "@/lib/case-manager/match-gc";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import { getServerSession } from "@/lib/auth/session-cookie";

const CASE_OWNER_QUERY = `
  query CmCaseActionOwner($id: bigint!) {
    cases_by_pk(id: $id) {
      id
      created_by
      case_manager_case_managers
      surrogate_mother_surrogate_mothers
    }
  }
`;

const ASSIGN_MANAGER_MUTATION = `
  mutation CmAssignCaseManager($id: bigint!, $cmId: bigint!) {
    update_cases_by_pk(
      pk_columns: { id: $id }
      _set: { case_manager_case_managers: $cmId }
    ) {
      id
      case_manager_case_managers
    }
  }
`;

type ActionBody =
  | { action: "assign_case_manager" }
  | { action: "match_gc"; surrogateId: string };

function parseCaseId(raw: string): string | null {
  const t = raw.trim();
  return /^\d+$/u.test(t) ? t : null;
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const caseId = parseCaseId(id);
  if (!caseId) {
    return NextResponse.json({ error: "bad_case_id" }, { status: 400 });
  }
  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (body.action === "match_gc") {
    const access = await caseManagerCanAccessCase(session, caseId);
    if (!access.allowed) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (access.hasSurrogate) {
      return NextResponse.json({ error: "already_matched_gc" }, { status: 409 });
    }
    const result = await matchGcToCase(caseId, body.surrogateId ?? "");
    if (!result.ok) {
      const status =
        result.error === "surrogate_has_case" || result.error === "already_matched_gc" ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true });
  }

  const client = getClient();
  const owner = await client.execute<{
    cases_by_pk: {
      id: string | number;
      created_by: string | number | null;
      case_manager_case_managers: string | number | null;
      surrogate_mother_surrogate_mothers: string | number | null;
    } | null;
  }>({
    query: CASE_OWNER_QUERY,
    variables: { id: caseId },
  });
  const row = owner.cases_by_pk;
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (body.action === "assign_case_manager") {
    if (String(row.created_by ?? "") !== String(session.userId)) {
      return NextResponse.json({ error: "forbidden_not_creator" }, { status: 403 });
    }
    if (row.case_manager_case_managers != null) {
      return NextResponse.json({ error: "already_assigned" }, { status: 409 });
    }
    const cmId = await resolveCaseManagerEntityId(session);
    if (!cmId) {
      return NextResponse.json({ error: "case_manager_not_bound" }, { status: 403 });
    }
    await client.execute({
      query: ASSIGN_MANAGER_MUTATION,
      variables: { id: caseId, cmId },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unsupported_action" }, { status: 400 });
}
