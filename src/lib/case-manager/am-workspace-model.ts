import { STAGE_DATA_LEGACY_KEYS, STAGE_FIELD_LEGACY_KEYS, type CanonicalCaseStage } from "@/constants/case-stages";
import type { AmStageFieldDef } from "@/constants/am-stage-fields-types";
import { isAmStageFieldRequired } from "@/lib/case-manager/am-stage-field-required";

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
  return migrateWorkspaceStageKeys({ v: 1, byStage: out as AmWorkspacePayload["byStage"] });
}

/** 合并旧阶段键下的字段到现行 canonical 阶段 */
export function migrateWorkspaceStageKeys(payload: AmWorkspacePayload): AmWorkspacePayload {
  const byStage = { ...payload.byStage };
  for (const [canonical, legacyKeys] of Object.entries(STAGE_DATA_LEGACY_KEYS) as Array<
    [CanonicalCaseStage, readonly string[]]
  >) {
    const merged = migrateStageFieldKeys({ ...(byStage[canonical] ?? {}) });
    let changed = Boolean(byStage[canonical]);
    for (const legacy of legacyKeys) {
      const row = byStage[legacy as CanonicalCaseStage];
      if (!row) continue;
      const migrated = migrateStageFieldKeys(row);
      for (const [k, v] of Object.entries(migrated)) {
        if (String(merged[k] ?? "").trim() === "" && String(v ?? "").trim() !== "") {
          merged[k] = v;
          changed = true;
        }
      }
      delete byStage[legacy as CanonicalCaseStage];
      changed = true;
    }
    if (changed) byStage[canonical] = merged;
  }
  for (const [stage, row] of Object.entries(byStage) as Array<[CanonicalCaseStage, Record<string, string>]>) {
    byStage[stage] = migrateStageFieldKeys(row);
  }
  return { v: payload.v, byStage };
}

function migrateStageFieldKeys(row: Record<string, string>): Record<string, string> {
  const out = { ...row };
  for (const [legacyKey, canonicalKey] of Object.entries(STAGE_FIELD_LEGACY_KEYS)) {
    if (String(out[canonicalKey] ?? "").trim() !== "") continue;
    const legacyVal = out[legacyKey];
    if (String(legacyVal ?? "").trim() === "") continue;
    out[canonicalKey] = legacyVal;
    delete out[legacyKey];
  }
  return out;
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

/** 按 showWhen 判断字段在当前阶段取值下是否可见 */
export function isAmStageFieldVisible(
  def: AmStageFieldDef,
  row: Record<string, string>,
): boolean {
  if (!def.showWhen) return true;
  const v = String(row[def.showWhen.key] ?? "").trim();
  return def.showWhen.values.includes(v);
}

export function isStageComplete(
  stage: string,
  payload: AmWorkspacePayload,
  fields: AmStageFieldDef[],
): boolean {
  const row = payload.byStage[stage as CanonicalCaseStage] ?? {};
  const required = fields.filter((f) => isAmStageFieldVisible(f, row) && isAmStageFieldRequired(f));
  if (required.length === 0) return true;
  return required.every((f) => String(row[f.key] ?? "").trim() !== "");
}
