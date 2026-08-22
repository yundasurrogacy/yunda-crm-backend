import type { CaseCycleRecord } from "@/lib/case-manager/fetch-case-detail";

export function parseCyclesFromCaseData(caseData: unknown): {
  cycles: CaseCycleRecord[];
  current_cycle_id: string | null;
} {
  if (!caseData || typeof caseData !== "object" || Array.isArray(caseData)) {
    return { cycles: [], current_cycle_id: null };
  }
  const o = caseData as Record<string, unknown>;
  const raw = o.cycles;
  const cycles: CaseCycleRecord[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const c = item as Record<string, unknown>;
      const id = String(c.id ?? "").trim();
      const status = String(c.status ?? "");
      if (!id) continue;
      if (status !== "active" && status !== "failed" && status !== "completed") continue;
      cycles.push({
        id,
        status,
        started_at: String(c.started_at ?? ""),
        ended_at: c.ended_at != null ? String(c.ended_at) : undefined,
        note: c.note != null ? String(c.note) : undefined,
      });
    }
  }
  const current =
    typeof o.currentCycleId === "string" && o.currentCycleId.trim()
      ? o.currentCycleId.trim()
      : cycles.find((c) => c.status === "active")?.id ?? null;
  return { cycles, current_cycle_id: current };
}

export function withCyclesInCaseData(
  caseData: unknown,
  cycles: CaseCycleRecord[],
  currentCycleId: string | null,
): Record<string, unknown> {
  const base: Record<string, unknown> =
    caseData && typeof caseData === "object" && !Array.isArray(caseData)
      ? { ...(caseData as Record<string, unknown>) }
      : {};
  base.cycles = cycles;
  base.currentCycleId = currentCycleId;
  return base;
}
