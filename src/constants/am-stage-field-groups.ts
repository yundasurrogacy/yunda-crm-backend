import raw from "@/constants/am-stage-fields-from-xlsx.json";
import type { AmStageFieldGroup } from "@/constants/am-stage-fields-types";

export const AM_STAGE_FIELD_GROUPS = raw as AmStageFieldGroup[];

/** Excel 阶段名应与 `CANONICAL_CASE_STAGES` 一致（不含 GC/IP profile_data 字段） */
export function getFieldsForStage(stage: string): AmStageFieldGroup["fields"] {
  const direct = AM_STAGE_FIELD_GROUPS.find((g) => g.stage === stage)?.fields;
  if (direct) return direct;
  if (stage === "GC Match Completed") {
    return AM_STAGE_FIELD_GROUPS.find((g) => g.stage === "Match Call Scheduled")?.fields ?? [];
  }
  return [];
}
