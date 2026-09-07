import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session-cookie";
import { fetchCmFilterOptions } from "@/lib/case-manager/fetch-cm-filter-options";

export async function GET() {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await fetchCmFilterOptions(session));
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
