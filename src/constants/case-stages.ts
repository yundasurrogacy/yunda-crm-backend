/**
 * AM 流程阶段；与 `cases.process_status` 存值一致（英文 canonical）。
 */
export const CANONICAL_CASE_STAGES = [
  "GC Matching",
  "GC Pre-Screening",
  "Retainer & Escrow Pending",
  "Medical Screening",
  "Legal Clearance",
  "IVF Cycle Started",
  "Heartbeat Confirmed",
  "IVF Graduation",
  "Third Trimester",
  "Delivery Completed",
] as const;

export type CanonicalCaseStage = (typeof CANONICAL_CASE_STAGES)[number];

const LEGACY_TO_CANONICAL: Record<string, CanonicalCaseStage> = {
  "Match Call Scheduled": "GC Pre-Screening",
  "GC Match Completed": "GC Pre-Screening",
  "Contracting & Escrow Pending": "Retainer & Escrow Pending",
  "IVF Cycle Active": "IVF Cycle Started",
};

/** 旧 `cases.data.byStage` 键 → 现行 canonical 阶段（合并字段时用） */
export const STAGE_DATA_LEGACY_KEYS: Partial<Record<CanonicalCaseStage, readonly string[]>> = {
  "GC Pre-Screening": ["GC Match Completed", "Match Call Scheduled"],
  "Retainer & Escrow Pending": ["Contracting & Escrow Pending"],
  "IVF Cycle Started": ["IVF Cycle Active"],
};

/** 旧字段 key → 新字段 key（同阶段内迁移） */
export const STAGE_FIELD_LEGACY_KEYS: Record<string, string> = {
  dedicated_heartbeat_field: "heartbeat_confirmed_date",
  health_plan_type: "health_insurance_plan",
  health_policy_number: "health_insurance_id_number",
  health_monthly_premium: "health_insurance_premium",
  life_monthly_premium: "life_insurance_premium",
};

const CANONICAL_TO_QUERY_VALUES: Record<CanonicalCaseStage, readonly string[]> = {
  "GC Matching": ["GC Matching"],
  "GC Pre-Screening": ["GC Pre-Screening", "GC Match Completed", "Match Call Scheduled"],
  "Retainer & Escrow Pending": ["Retainer & Escrow Pending", "Contracting & Escrow Pending"],
  "Medical Screening": ["Medical Screening"],
  "Legal Clearance": ["Legal Clearance"],
  "IVF Cycle Started": ["IVF Cycle Started", "IVF Cycle Active"],
  "Heartbeat Confirmed": ["Heartbeat Confirmed"],
  "IVF Graduation": ["IVF Graduation"],
  "Third Trimester": ["Third Trimester"],
  "Delivery Completed": ["Delivery Completed"],
};

export function normalizeCanonicalCaseStage(raw: string | null | undefined): CanonicalCaseStage | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if ((CANONICAL_CASE_STAGES as readonly string[]).includes(s)) return s as CanonicalCaseStage;
  return LEGACY_TO_CANONICAL[s] ?? null;
}

export function canonicalStageQueryValues(stage: CanonicalCaseStage): readonly string[] {
  return CANONICAL_TO_QUERY_VALUES[stage];
}

export function isCanonicalCaseStage(s: string): s is CanonicalCaseStage {
  return (CANONICAL_CASE_STAGES as readonly string[]).includes(s);
}

export function canonicalStageIndex(stage: string): number {
  const normalized = normalizeCanonicalCaseStage(stage);
  if (!normalized) return -1;
  return (CANONICAL_CASE_STAGES as readonly string[]).indexOf(normalized);
}

export function nextCanonicalStage(stage: CanonicalCaseStage): CanonicalCaseStage | null {
  const normalized = normalizeCanonicalCaseStage(stage);
  if (!normalized) return null;
  const i = (CANONICAL_CASE_STAGES as readonly string[]).indexOf(normalized);
  if (i < 0 || i >= CANONICAL_CASE_STAGES.length - 1) return null;
  return CANONICAL_CASE_STAGES[i + 1]!;
}
