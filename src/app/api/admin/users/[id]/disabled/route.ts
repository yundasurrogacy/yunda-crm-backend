import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session-cookie";
import { setUserDisabled, type UserDisableError } from "@/lib/admin/user-disabled";

type RouteCtx = { params: Promise<{ id: string }> };

type Body = { disabled?: unknown };

const STATUS_BY_ERROR: Record<UserDisableError, number> = {
  not_found: 404,
  cannot_disable_self: 400,
  update_failed: 500,
};

/** Admin：停用 / 恢复登录账号（数据保留，仅禁止登录并使现有会话失效） */
export async function POST(req: Request, ctx: RouteCtx) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!/^\d+$/u.test(id)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (typeof body.disabled !== "boolean") {
    return NextResponse.json({ error: "bad_disabled" }, { status: 400 });
  }

  const result = await setUserDisabled(session.userId, id, body.disabled);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: STATUS_BY_ERROR[result.error] });
  }
  return NextResponse.json({ ok: true, disabled_at: result.disabled_at });
}
