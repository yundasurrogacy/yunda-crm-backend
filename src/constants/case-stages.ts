/**
 * AM 确认版 PDF 固定 11 阶段；与 `cases.process_status` 存值一致（英文 canonical）。
 */
export const CANONICAL_CASE_STAGES = [
  "GC Matching",
  "Match Call Scheduled",
  "GC Pre-Screening",
  "Contracting & Escrow Pending",
  "Medical Screening",
  "Legal Clearance",
  "IVF Cycle Active",
  "Heartbeat Confirmed",
  "IVF Graduation",
  "Third Trimester",
  "Delivery Completed",
] as const;

export type CanonicalCaseStage = (typeof CANONICAL_CASE_STAGES)[number];

export function isCanonicalCaseStage(s: string): s is CanonicalCaseStage {
  return (CANONICAL_CASE_STAGES as readonly string[]).includes(s);
}

export function canonicalStageIndex(stage: string): number {
  return (CANONICAL_CASE_STAGES as readonly string[]).indexOf(stage);
}

export function nextCanonicalStage(stage: CanonicalCaseStage): CanonicalCaseStage | null {
  const i = (CANONICAL_CASE_STAGES as readonly string[]).indexOf(stage);
  if (i < 0 || i >= CANONICAL_CASE_STAGES.length - 1) return null;
  return CANONICAL_CASE_STAGES[i + 1]!;
}
