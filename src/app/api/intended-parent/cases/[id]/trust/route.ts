import { NextResponse } from "next/server";
import { listPartyVisibleTrustLedger } from "@/lib/case-manager/trust-ledger";
import { getServerSession } from "@/lib/auth/session-cookie";

/** 准父母端：只读信托余额 + 客户可见流水 */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("intended_parent")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const data = await listPartyVisibleTrustLedger(session, id);
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
