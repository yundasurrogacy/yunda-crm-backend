import { NextResponse } from "next/server";
import { createPartyEntity } from "@/lib/party/create-party-entity";
import { listCaseManagerParties } from "@/lib/party/list-cm-parties";
import { resolveCaseManagerEntityId } from "@/lib/case-manager/fetch-dashboard-data";
import type { EntityKind } from "@/lib/admin/entity-profile";
import { getServerSession } from "@/lib/auth/session-cookie";

function parseKind(raw: string | null): EntityKind | null {
  if (raw === "intended_parent" || raw === "surrogate_mother") return raw;
  return null;
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const kind = parseKind(searchParams.get("kind"));
  if (!kind) return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  const q = searchParams.get("q") ?? "";
  const includeDeleted = searchParams.get("includeDeleted") === "1";
  try {
    const cmId = await resolveCaseManagerEntityId(session);
    const rows = await listCaseManagerParties(kind, cmId, session.userId, { q, includeDeleted });
    return NextResponse.json({ rows, cmId });
  } catch (e) {
    console.error("[case-manager/parties GET]", e);
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

type PostBody = {
  kind?: unknown;
  email?: unknown;
  displayName?: unknown;
};

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const kind = parseKind(typeof body.kind === "string" ? body.kind : null);
  if (!kind) return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  const email = typeof body.email === "string" ? body.email : "";
  const displayName = typeof body.displayName === "string" ? body.displayName : undefined;

  const cmId = await resolveCaseManagerEntityId(session);
  if (!cmId) {
    return NextResponse.json({ error: "case_manager_not_bound" }, { status: 400 });
  }

  const result = await createPartyEntity({
    kind,
    email,
    displayName,
    createdByCmId: cmId,
    createdByUserId: session.userId,
  });
  if (!result.ok) {
    const status =
      result.error === "bad_email" ? 400 : result.error === "email_taken" ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
