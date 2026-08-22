import { NextResponse } from "next/server";
import { getClient } from "@/config-lib/graphql-client";
import { listUnboundEntities, type BindRoleKind } from "@/lib/admin/bind-user-role";
import { getServerSession } from "@/lib/auth/session-cookie";

function parseKind(raw: string | null): BindRoleKind | null {
  if (raw === "case_manager" || raw === "intended_parent" || raw === "surrogate_mother") return raw;
  return null;
}

/** 管理端：列出尚未绑定登录账号的业务档案，供选择绑定。 */
export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const kind = parseKind(searchParams.get("kind"));
  if (!kind) {
    return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  }
  const q = searchParams.get("q") ?? "";
  try {
    const client = getClient();
    const options = await listUnboundEntities(client, kind, { q, limit: 50 });
    return NextResponse.json({ options });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
