import { NextResponse } from "next/server";
import { listCaseFilesForParty } from "@/lib/case-manager/case-files";
import { getServerSession } from "@/lib/auth/session-cookie";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("surrogate_mother")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const files = await listCaseFilesForParty(session, id, "surrogate_mother_api");
    if (!files) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
