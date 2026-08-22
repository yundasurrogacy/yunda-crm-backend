import { NextResponse } from "next/server";
import { getClient } from "@/config-lib/graphql-client";
import { setPrimaryAndLinkCaseManagers } from "@/lib/case-manager/case-case-managers";
import { getServerSession } from "@/lib/auth/session-cookie";

const CM_EXISTS = `
  query AdminCmExists($id: bigint!) {
    case_managers_by_pk(id: $id) {
      id
    }
  }
`;

type Body = { caseIds?: unknown; caseManagerId?: unknown };

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const cmId =
    typeof body.caseManagerId === "string" && /^\d+$/u.test(body.caseManagerId.trim())
      ? body.caseManagerId.trim()
      : null;
  const caseIds = Array.isArray(body.caseIds)
    ? body.caseIds
        .map((x) => (typeof x === "string" || typeof x === "number" ? String(x).trim() : ""))
        .filter((x) => /^\d+$/u.test(x))
    : [];

  if (!cmId || caseIds.length === 0) {
    return NextResponse.json({ error: "bad_ids" }, { status: 400 });
  }
  if (caseIds.length > 200) {
    return NextResponse.json({ error: "too_many" }, { status: 400 });
  }

  try {
    const client = getClient();
    const cm = await client.execute<{ case_managers_by_pk: { id: string | number } | null }>({
      query: CM_EXISTS,
      variables: { id: cmId },
    });
    if (!cm.case_managers_by_pk) {
      return NextResponse.json({ error: "case_manager_not_found" }, { status: 404 });
    }

    const affected = await setPrimaryAndLinkCaseManagers(caseIds, cmId);
    return NextResponse.json({ ok: true, affected });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
