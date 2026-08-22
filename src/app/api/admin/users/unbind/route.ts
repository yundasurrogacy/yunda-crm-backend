import { NextResponse } from "next/server";
import { getClient } from "@/config-lib/graphql-client";
import { unbindUserFromBusinessRole, type BindRoleKind } from "@/lib/admin/bind-user-role";
import { getServerSession } from "@/lib/auth/session-cookie";

function parseId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return /^\d+$/u.test(t) ? t : null;
}

function parseKind(raw: unknown): BindRoleKind | null {
  if (raw === "case_manager" || raw === "intended_parent" || raw === "surrogate_mother") return raw;
  return null;
}

type Body = { userId?: unknown; kind?: unknown };

/** 管理端：解除登录账号与业务主体（CM/IP/GC）绑定，档案保留。 */
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
    const r = await unbindUserFromBusinessRole(client, userId, kind);
    if (!r.ok) {
      return NextResponse.json({ error: r.message }, { status: 500 });
    }
    if (r.affected === 0) {
      return NextResponse.json({ error: "not_linked" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, affected: r.affected });
  } catch {
    return NextResponse.json({ error: "unbind_failed" }, { status: 500 });
  }
}
