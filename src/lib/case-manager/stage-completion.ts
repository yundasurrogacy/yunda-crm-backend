import { getFieldsForStage } from "@/constants/am-stage-field-groups";
import type { AmStageFieldDef } from "@/constants/am-stage-fields-types";
import { isCanonicalCaseStage, type CanonicalCaseStage } from "@/constants/case-stages";
import type { AmWorkspacePayload } from "@/lib/case-manager/am-workspace-model";

/** 当前阶段下仍未填写（trim 后为空）的字段定义，用于提示用户为何不解除「进入下一阶段」禁用 */
export function listIncompleteFieldDefs(stage: string, payload: AmWorkspacePayload): AmStageFieldDef[] {
  if (!isCanonicalCaseStage(stage)) return [];
  const fields = getFieldsForStage(stage);
  const row = payload.byStage[stage as CanonicalCaseStage] ?? {};
  return fields.filter((f) => String(row[f.key] ?? "").trim() === "");
}
