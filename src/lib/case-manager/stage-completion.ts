import { getFieldsForStage } from "@/constants/am-stage-field-groups";
import type { AmStageFieldDef } from "@/constants/am-stage-fields-types";
import { isCanonicalCaseStage, type CanonicalCaseStage } from "@/constants/case-stages";
import { isAmStageFieldRequired } from "@/lib/case-manager/am-stage-field-required";
import {
  isAmStageFieldVisible,
  type AmWorkspacePayload,
} from "@/lib/case-manager/am-workspace-model";

/** 当前阶段下仍未填写的必填字段，用于提示为何无法推进 */
export function listIncompleteFieldDefs(stage: string, payload: AmWorkspacePayload): AmStageFieldDef[] {
  if (!isCanonicalCaseStage(stage)) return [];
  const row = payload.byStage[stage as CanonicalCaseStage] ?? {};
  return getFieldsForStage(stage).filter(
    (f) =>
      isAmStageFieldVisible(f, row) &&
      isAmStageFieldRequired(f) &&
      String(row[f.key] ?? "").trim() === "",
  );
}
