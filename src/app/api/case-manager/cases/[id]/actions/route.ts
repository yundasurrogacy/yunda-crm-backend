import { NextResponse } from "next/server";
import { getClient } from "@/config-lib/graphql-client";
import { caseManagerCanAccessCase } from "@/lib/case-manager/case-access";
import { setCaseArchived } from "@/lib/case-manager/case-archive";
import { linkCaseManagerToCase, setPrimaryAndLinkCaseManagers } from "@/lib/case-manager/case-case-managers";
import { failCurrentCycleAndStartNew } from "@/lib/case-manager/case-cycle-actions";
import { matchGcToCase, replaceGcOnCase } from "@/lib/case-manager/match-gc";
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

type ActionBody =
  | { action: "assign_case_manager" }
  | { action: "match_gc"; surrogateId: string }
  | { action: "replace_gc"; surrogateId: string }
  | { action: "archive" }
  | { action: "unarchive" }
  | { action: "fail_cycle"; note?: string };

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

  if (body.action === "match_gc" || body.action === "replace_gc") {
    const access = await caseManagerCanAccessCase(session, caseId);
    if (!access.allowed) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (body.action === "match_gc" && access.hasSurrogate) {
      return NextResponse.json({ error: "already_matched_gc" }, { status: 409 });
    }
    if (body.action === "replace_gc" && !access.hasSurrogate) {
      return NextResponse.json({ error: "no_gc_to_replace" }, { status: 400 });
    }
    const cmId =
      body.action === "replace_gc" ? await resolveCaseManagerEntityId(session) : null;
    const result =
      body.action === "replace_gc"
        ? await replaceGcOnCase(caseId, body.surrogateId ?? "", {
            byRole: "case_manager",
            byEntityId: cmId,
            byLabel: session.email?.trim() || null,
          })
        : await matchGcToCase(caseId, body.surrogateId ?? "");
    if (!result.ok) {
      const status =
        result.error === "surrogate_has_case" ||
        result.error === "already_matched_gc" ||
        result.error === "same_surrogate"
          ? 409
          : result.error === "not_found"
            ? 404
            : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "archive" || body.action === "unarchive") {
    const access = await caseManagerCanAccessCase(session, caseId);
    if (!access.allowed) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const result = await setCaseArchived(
      session,
      caseId,
      "case_manager_api",
      body.action === "archive",
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error === "not_found" ? 404 : 503 });
    }
    return NextResponse.json({ ok: true, archived: body.action === "archive" });
  }

  if (body.action === "fail_cycle") {
    const access = await caseManagerCanAccessCase(session, caseId);
    if (!access.allowed) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const result = await failCurrentCycleAndStartNew(
      session,
      caseId,
      "case_manager_api",
      typeof body.note === "string" ? body.note : undefined,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error === "not_found" ? 404 : 503 });
    }
    return NextResponse.json(result);
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
    const cmId = await resolveCaseManagerEntityId(session);
    if (!cmId) {
      return NextResponse.json({ error: "case_manager_not_bound" }, { status: 403 });
    }
    if (row.case_manager_case_managers == null) {
      await setPrimaryAndLinkCaseManagers([caseId], cmId);
    } else {
      await linkCaseManagerToCase(caseId, cmId);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unsupported_action" }, { status: 400 });
}
