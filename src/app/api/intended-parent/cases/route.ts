import { NextResponse } from "next/server";
import { fetchPartyCases } from "@/lib/party/fetch-party-cases";
import { resolvePartyEntityId } from "@/lib/party/resolve-party-entity";
import { getServerSession } from "@/lib/auth/session-cookie";

export async function GET() {
  const session = await getServerSession();
  if (!session?.portals.includes("intended_parent")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const entityId = await resolvePartyEntityId("intended_parent", session.userId);
  if (!entityId) {
    return NextResponse.json({ rows: [], entityId: null });
  }

  try {
    const rows = await fetchPartyCases("intended_parent", entityId);
    return NextResponse.json({ rows, entityId });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
