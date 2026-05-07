import { NextResponse } from "next/server";
import { fetchCaseDetail } from "@/lib/case-manager/fetch-case-detail";
import { getServerSession } from "@/lib/auth/session-cookie";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const detail = await fetchCaseDetail(session, id, { mode: "admin_api" });
    if (!detail) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
