import { getFieldsForStage } from "@/constants/am-stage-field-groups";
import {
  canonicalStageIndex,
  isCanonicalCaseStage,
  nextCanonicalStage,
  type CanonicalCaseStage,
} from "@/constants/case-stages";
import { mergeStageFields, isStageComplete } from "@/lib/case-manager/am-workspace-model";
import { persistCaseDataWorkspace, updateCaseProcessStatus } from "@/lib/case-manager/am-workspace-mutations";
import {
  fetchCaseDetail,
  type AmCaseDetail,
  type CaseDetailAccessMode,
} from "@/lib/case-manager/fetch-case-detail";
import { normalizeToMmDdYyyy } from "@/lib/case-manager/mm-dd-yyyy";
import type { CrmSession } from "@/types/portal";

export type CaseWorkspacePatchBody = {
  workspace?: { stage: string; fields: Record<string, string> };
  advance?: boolean;
};

type WriteMode = Extract<CaseDetailAccessMode, "case_manager_api" | "admin_api">;

export type CaseWorkspacePatchResult =
  | { ok: true; detail: AmCaseDetail }
  | { ok: false; status: number; error: string; stage?: string };

/** Admin / CM 共用：保存阶段字段并可选推进阶段。 */
export async function applyCaseWorkspacePatch(
  session: CrmSession,
  caseIdRaw: string,
  mode: WriteMode,
  body: CaseWorkspacePatchBody,
): Promise<CaseWorkspacePatchResult> {
  const detail = await fetchCaseDetail(session, caseIdRaw, { mode });
  if (!detail) {
    return { ok: false, status: 404, error: "not_found" };
  }

  const caseIdBig = BigInt(detail.id);
  let payload = detail.stage_data;

  const patch = body.workspace;
  if (patch?.stage && patch.fields && typeof patch.stage === "string") {
    if (!isCanonicalCaseStage(patch.stage)) {
      return { ok: false, status: 400, error: "invalid_stage" };
    }
    const cur = detail.process_status ?? "";
    const curIdxForLock = isCanonicalCaseStage(cur) ? canonicalStageIndex(cur) : 0;
    const targetIdx = canonicalStageIndex(patch.stage);
    if (targetIdx > curIdxForLock) {
      return { ok: false, status: 403, error: "stage_locked_future" };
    }

    const fieldDefs = getFieldsForStage(patch.stage);
    const normalizedFields: Record<string, string> = { ...patch.fields };
    for (const def of fieldDefs) {
      const raw = normalizedFields[def.key];
      if (raw == null || String(raw).trim() === "") continue;
      if (def.type.trim() === "Date") {
        normalizedFields[def.key] = normalizeToMmDdYyyy(String(raw));
      }
    }

    payload = mergeStageFields(payload, patch.stage, normalizedFields);
    await persistCaseDataWorkspace(session, caseIdBig, payload, mode);
  }

  if (body.advance) {
    const cur = detail.process_status;
    if (!cur || !isCanonicalCaseStage(cur)) {
      return { ok: false, status: 400, error: "invalid_current_stage" };
    }
    if (patch?.stage && patch.stage !== cur) {
      return { ok: false, status: 400, error: "advance_only_with_current_stage" };
    }
    const staged =
      patch?.stage === cur && patch.fields ? mergeStageFields(payload, cur, patch.fields) : payload;
    const fields = getFieldsForStage(cur);
    if (!isStageComplete(cur, staged, fields)) {
      return { ok: false, status: 400, error: "stage_incomplete", stage: cur };
    }
    const next = nextCanonicalStage(cur as CanonicalCaseStage);
    if (!next) {
      return { ok: false, status: 400, error: "already_last_stage" };
    }
    await updateCaseProcessStatus(session, caseIdBig, next, mode);
  }

  const fresh = await fetchCaseDetail(session, caseIdRaw, { mode });
  if (!fresh) {
    return { ok: false, status: 404, error: "not_found" };
  }
  return { ok: true, detail: fresh };
}
