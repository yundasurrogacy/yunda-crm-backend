import { NextResponse } from "next/server";
import { fetchSessionIdentity } from "@/lib/auth/fetch-session-identity";
import { getServerSession } from "@/lib/auth/session-cookie";
import type { PortalId } from "@/types/portal";

function parseShell(raw: string | null): "admin" | PortalId | null {
  if (raw === "admin") return "admin";
  if (raw === "case_manager" || raw === "intended_parent" || raw === "surrogate_mother") {
    return raw;
  }
  return null;
}

/** 当前登录用户 +（非管理端时）已绑定的业务档案摘要 */
export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const shell = parseShell(new URL(req.url).searchParams.get("shell"));
  if (!shell) {
    return NextResponse.json({ error: "bad_shell" }, { status: 400 });
  }
  try {
    const identity = await fetchSessionIdentity(session, shell);
    return NextResponse.json(identity);
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
