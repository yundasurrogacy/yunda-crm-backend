import type { CanonicalCaseStage } from "@/constants/case-stages";
import type { AmStageFieldDef } from "@/constants/am-stage-fields-types";

/** 各阶段表单；与 `cases.data` 根级字段一致：`v` + `byStage` */
export type AmWorkspacePayload = {
  v: 1;
  /** key = Excel / process_status canonical stage title */
  byStage: Partial<Record<CanonicalCaseStage, Record<string, string>>>;
};

export function emptyWorkspace(): AmWorkspacePayload {
  return { v: 1, byStage: {} };
}

/** 从 `cases.data` 根级解析各阶段字段（`v` + `byStage`） */
export function workspaceFromCaseData(caseData: unknown): AmWorkspacePayload {
  return parseWorkspaceUrl(caseData);
}

/** 解析 `{ v, byStage }` 形态的对象（用于读 `cases.data`） */
export function parseWorkspaceUrl(raw: unknown): AmWorkspacePayload {
  if (!raw || typeof raw !== "object") return emptyWorkspace();
  const o = raw as Record<string, unknown>;
  const rawStages = o.byStage;
  if (!rawStages || typeof rawStages !== "object") return emptyWorkspace();
  const out: Partial<Record<string, Record<string, string>>> = {};
  for (const [stage, blob] of Object.entries(rawStages as Record<string, unknown>)) {
    if (!blob || typeof blob !== "object") continue;
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(blob as Record<string, unknown>))
      row[k] = v == null ? "" : String(v).trim();
    out[stage] = row;
  }
  return { v: 1, byStage: out as AmWorkspacePayload["byStage"] };
}

export function mergeStageFields(
  payload: AmWorkspacePayload,
  stage: string,
  patch: Record<string, string>,
): AmWorkspacePayload {
  const prev = { ...(payload.byStage[stage as CanonicalCaseStage] ?? {}) };
  for (const [k, v] of Object.entries(patch)) prev[k] = v ?? "";
  return {
    v: 1,
    byStage: { ...payload.byStage, [stage]: prev } as AmWorkspacePayload["byStage"],
  };
}

export function isStageComplete(
  stage: string,
  payload: AmWorkspacePayload,
  fields: AmStageFieldDef[],
): boolean {
  if (fields.length === 0) return true;
  const row = payload.byStage[stage as CanonicalCaseStage] ?? {};
  return fields.every((f) => String(row[f.key] ?? "").trim() !== "");
}
