import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session-cookie";
import { fetchPartyCasePagePayload } from "@/lib/party/fetch-party-case-page";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("surrogate_mother")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const payload = await fetchPartyCasePagePayload(session, id, "surrogate_mother_api");
    if (!payload) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
