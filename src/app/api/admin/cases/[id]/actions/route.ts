import { NextResponse } from "next/server";
import { getClient } from "@/config-lib/graphql-client";
import { setCaseArchived } from "@/lib/case-manager/case-archive";
import { failCurrentCycleAndStartNew } from "@/lib/case-manager/case-cycle-actions";
import { matchGcToCase, replaceGcOnCase } from "@/lib/case-manager/match-gc";
import { getServerSession } from "@/lib/auth/session-cookie";

const CASE_ROW_QUERY = `
  query AdminCaseGcBind($id: bigint!) {
    cases_by_pk(id: $id) {
      id
      surrogate_mother_surrogate_mothers
    }
  }
`;

type PatchBody =
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
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const caseId = parseCaseId(id);
  if (!caseId) return NextResponse.json({ error: "bad_case_id" }, { status: 400 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (body.action === "archive" || body.action === "unarchive") {
    const result = await setCaseArchived(session, caseId, "admin_api", body.action === "archive");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error === "not_found" ? 404 : 503 });
    }
    return NextResponse.json({ ok: true, archived: body.action === "archive" });
  }

  if (body.action === "fail_cycle") {
    const result = await failCurrentCycleAndStartNew(
      session,
      caseId,
      "admin_api",
      typeof body.note === "string" ? body.note : undefined,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error === "not_found" ? 404 : 503 });
    }
    return NextResponse.json(result);
  }

  if (body.action !== "match_gc" && body.action !== "replace_gc") {
    return NextResponse.json({ error: "unsupported_action" }, { status: 400 });
  }

  const client = getClient();
  const owner = await client.execute<{
    cases_by_pk: {
      id: string | number;
      surrogate_mother_surrogate_mothers: string | number | null;
    } | null;
  }>({
    query: CASE_ROW_QUERY,
    variables: { id: caseId },
  });

  const row = owner.cases_by_pk;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body.action === "match_gc") {
    if (row.surrogate_mother_surrogate_mothers != null) {
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

  if (row.surrogate_mother_surrogate_mothers == null) {
    return NextResponse.json({ error: "no_gc_to_replace" }, { status: 400 });
  }
  const result = await replaceGcOnCase(caseId, body.surrogateId ?? "", {
    byRole: "admin",
    byEntityId: null,
    byLabel: session.email?.trim() || null,
  });
  if (!result.ok) {
    const status =
      result.error === "surrogate_has_case" || result.error === "same_surrogate"
        ? 409
        : result.error === "not_found"
          ? 404
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
