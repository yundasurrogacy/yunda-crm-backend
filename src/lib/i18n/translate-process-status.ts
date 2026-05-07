import type { TFunction } from "i18next";

/** Map case `process_status` / canonical stage string → localized label with safe fallback */
export function translateProcessStatus(raw: string | null | undefined, tCaseStage: TFunction): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";
  return tCaseStage(s, {
    ns: "caseStage",
    defaultValue: s,
  });
}
