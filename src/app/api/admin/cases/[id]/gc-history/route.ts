import { NextResponse } from "next/server";
import { canAccessCase } from "@/lib/case-manager/case-access";
import { listCaseGcHistory } from "@/lib/case-manager/case-gc-history";
import { listCaseMessages } from "@/lib/case-manager/case-messages";
import { getServerSession } from "@/lib/auth/session-cookie";
import { parseIncludeParam } from "@/lib/http/parse-include";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const include = parseIncludeParam(new URL(req.url).searchParams.get("include"));
  try {
    if (!(await canAccessCase(session, id, "admin_api"))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const [entries, messages] = await Promise.all([
      listCaseGcHistory(id),
      include.has("messages") ? listCaseMessages(session, id, "admin_api") : Promise.resolve(null),
    ]);
    return NextResponse.json({
      entries,
      ...(messages ? { messages } : {}),
    });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
