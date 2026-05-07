import { CANONICAL_CASE_STAGES } from "@/constants/case-stages";

/** 返回数据库原始字符串（trim）；无非兼容映射。 */
export function resolveProcessStatusForWorkflow(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = raw.trim();
  return s === "" ? null : s;
}

/** Hasura Console → Data → cases → process_status → 字段描述可粘贴（简体中文） */
export const HASURA_PROCESS_STATUS_DESCRIPTION_ZH = `
案例当前所处流程阶段，必须与系统内置的 11 个英文阶段名完全一致（勿使用中文或其它缩写）。
可选值（复制其一写入）：${CANONICAL_CASE_STAGES.join("；")}
含义顺序：GC 匹配 → … → 分娩完成。新建案例时一般由管理端选择初始阶段；案例经理在详情页填齐当前阶段必填项后可「进入下一阶段」，系统会更新本字段为下一阶段英文名。
`.trim();
