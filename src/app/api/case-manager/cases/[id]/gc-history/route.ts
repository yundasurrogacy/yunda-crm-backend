import { NextResponse } from "next/server";
import { canAccessCase } from "@/lib/case-manager/case-access";
import { listCaseGcHistory } from "@/lib/case-manager/case-gc-history";
import { listCaseMessages } from "@/lib/case-manager/case-messages";
import { getServerSession } from "@/lib/auth/session-cookie";
import { parseIncludeParam } from "@/lib/http/parse-include";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isAdmin = session.role === "admin";
  const isCm = session.portals.includes("case_manager");
  if (!isAdmin && !isCm) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const include = parseIncludeParam(new URL(req.url).searchParams.get("include"));
  const mode = isAdmin ? "admin_api" : "case_manager_api";
  try {
    if (!(await canAccessCase(session, id, mode))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const [entries, messages] = await Promise.all([
      listCaseGcHistory(id),
      include.has("messages") ? listCaseMessages(session, id, mode) : Promise.resolve(null),
    ]);
    return NextResponse.json({
      entries,
      ...(messages ? { messages } : {}),
    });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
