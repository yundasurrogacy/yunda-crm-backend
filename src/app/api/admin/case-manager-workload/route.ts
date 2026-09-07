import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session-cookie";
import { fetchAdminWorkloadPayload } from "@/lib/admin/case-manager-caseload";

/** 管理端：全部活跃案例经理的负责案例数（主 FK ∪ M2M） */
export async function GET() {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await fetchAdminWorkloadPayload());
  } catch (e) {
    console.error("[admin/case-manager-workload]", e);
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
