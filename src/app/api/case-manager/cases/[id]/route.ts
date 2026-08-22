import { NextResponse } from "next/server";
import {
  applyCaseWorkspacePatch,
  type CaseWorkspacePatchBody,
} from "@/lib/case-manager/patch-case-workspace";
import { fetchCaseDetail } from "@/lib/case-manager/fetch-case-detail";
import { getServerSession } from "@/lib/auth/session-cookie";

const CM_DETAIL = { mode: "case_manager_api" as const };

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const detail = await fetchCaseDetail(session, id, CM_DETAIL);
    if (!detail) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: CaseWorkspacePatchBody;
  try {
    body = (await req.json()) as CaseWorkspacePatchBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  try {
    const result = await applyCaseWorkspacePatch(session, id, "case_manager_api", body);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.stage ? { stage: result.stage } : {}) },
        { status: result.status },
      );
    }
    return NextResponse.json(result.detail);
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
