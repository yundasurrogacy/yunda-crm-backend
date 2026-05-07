import { NextResponse } from "next/server";
import { getFieldsForStage } from "@/constants/am-stage-field-groups";
import {
  canonicalStageIndex,
  isCanonicalCaseStage,
  nextCanonicalStage,
  type CanonicalCaseStage,
} from "@/constants/case-stages";
import { mergeStageFields, isStageComplete } from "@/lib/case-manager/am-workspace-model";
import { persistCaseDataWorkspace, updateCaseProcessStatus } from "@/lib/case-manager/am-workspace-mutations";
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

type PatchBody = {
  workspace?: { stage: string; fields: Record<string, string> };
  advance?: boolean;
};

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  try {
    const detail = await fetchCaseDetail(session, id, CM_DETAIL);
    if (!detail) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const caseIdBig = BigInt(detail.id);
    let payload = detail.stage_data;

    const patch = body.workspace;
    if (patch?.stage && patch.fields && typeof patch.stage === "string") {
      if (!isCanonicalCaseStage(patch.stage)) {
        return NextResponse.json({ error: "invalid_stage" }, { status: 400 });
      }
      const cur = detail.process_status ?? "";
      const curIdxForLock = isCanonicalCaseStage(cur) ? canonicalStageIndex(cur) : 0;
      const targetIdx = canonicalStageIndex(patch.stage);
      if (targetIdx > curIdxForLock) {
        return NextResponse.json({ error: "stage_locked_future" }, { status: 403 });
      }

      payload = mergeStageFields(payload, patch.stage, patch.fields);
      await persistCaseDataWorkspace(session, caseIdBig, payload);
    }

    if (body.advance) {
      const cur = detail.process_status;
      if (!cur || !isCanonicalCaseStage(cur)) {
        return NextResponse.json({ error: "invalid_current_stage" }, { status: 400 });
      }
      if (patch?.stage && patch.stage !== cur) {
        return NextResponse.json({ error: "advance_only_with_current_stage" }, { status: 400 });
      }
      const staged =
        patch?.stage === cur && patch.fields ? mergeStageFields(payload, cur, patch.fields) : payload;
      const fields = getFieldsForStage(cur);
      if (!isStageComplete(cur, staged, fields)) {
        return NextResponse.json({ error: "stage_incomplete", stage: cur }, { status: 400 });
      }
      const next = nextCanonicalStage(cur as CanonicalCaseStage);
      if (!next) {
        return NextResponse.json({ error: "already_last_stage" }, { status: 400 });
      }
      await updateCaseProcessStatus(session, caseIdBig, next);
    }

    const fresh = await fetchCaseDetail(session, id, CM_DETAIL);
    if (!fresh) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(fresh);
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
