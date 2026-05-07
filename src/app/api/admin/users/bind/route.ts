import { NextResponse } from "next/server";
import { getClient } from "@/config-lib/graphql-client";
import { bindUserToBusinessRole, type BindRoleKind } from "@/lib/admin/bind-user-role";
import { getServerSession } from "@/lib/auth/session-cookie";

const USER_PK = `
  query AdminUserPk($id: bigint!) {
    users_by_pk(id: $id) {
      id
      email
    }
  }
`;

function parseId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return /^\d+$/u.test(t) ? t : null;
}

function parseKind(raw: unknown): BindRoleKind | null {
  if (raw === "case_manager" || raw === "intended_parent" || raw === "surrogate_mother") return raw;
  return null;
}

type Body = { userId: string; kind: BindRoleKind };

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
  const userId = parseId(body.userId);
  const kind = parseKind(body.kind);
  if (!userId || !kind) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const client = getClient();
    const u = await client.execute<{ users_by_pk: { id: string | number; email: string } | null }>({
      query: USER_PK,
      variables: { id: userId },
    });
    const row = u.users_by_pk;
    if (!row) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }
    const r = await bindUserToBusinessRole(client, userId, kind, row.email);
    if (!r.ok) {
      return NextResponse.json({ error: r.message }, { status: 500 });
    }
    return NextResponse.json({
      entityId: r.entityId,
      alreadyLinked: r.alreadyLinked,
    });
  } catch {
    return NextResponse.json({ error: "bind_failed" }, { status: 500 });
  }
}
