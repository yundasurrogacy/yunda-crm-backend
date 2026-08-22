import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session-cookie";
import {
  getEntityDeletedAt,
  setEntitySoftDeleted,
  type SoftDeleteEntityKind,
} from "@/lib/soft-delete/entity-soft-delete";

function parseKind(raw: string): SoftDeleteEntityKind | null {
  if (raw === "case_manager" || raw === "intended_parent" || raw === "surrogate_mother") {
    return raw;
  }
  return null;
}

type RouteCtx = { params: Promise<{ kind: string; id: string }> };

type Body = { deleted?: unknown };

/** Admin：主体软删除 / 恢复（数据永久保留） */
export async function POST(req: Request, ctx: RouteCtx) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { kind: kindRaw, id } = await ctx.params;
  const kind = parseKind(kindRaw);
  if (!kind) return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  if (!/^\d+$/u.test(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (typeof body.deleted !== "boolean") {
    return NextResponse.json({ error: "bad_deleted" }, { status: 400 });
  }

  const existing = await getEntityDeletedAt(kind, id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const result = await setEntitySoftDeleted(kind, id, body.deleted);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, deleted_at: result.deleted_at });
}
