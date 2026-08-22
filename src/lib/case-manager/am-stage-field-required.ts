import type { AmStageFieldDef } from "@/constants/am-stage-fields-types";

/**
 * 推进下一阶段时是否必须填写该字段。
 * 细节-2：默认全部选填（留白也可保存 / Advance）；仅字段显式 `required: true` 才拦截。
 */
export function isAmStageFieldRequired(def: AmStageFieldDef): boolean {
  return def.required === true;
}
