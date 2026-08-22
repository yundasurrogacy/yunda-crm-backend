"use client";

import { Check, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  CANONICAL_CASE_STAGES,
  canonicalStageIndex,
  isCanonicalCaseStage,
} from "@/constants/case-stages";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";

export function PartyCaseProgressTimeline({ processStatus }: { processStatus: string | null }) {
  const { t } = useTranslation("portal");
  const { t: tStage } = useTranslation("caseStage");

  const curIdx = processStatus && isCanonicalCaseStage(processStatus) ? canonicalStageIndex(processStatus) : -1;
  const progressPct =
    curIdx >= 0 ? Math.round(((curIdx + 1) / CANONICAL_CASE_STAGES.length) * 100) : 0;

  return (
    <section className="crm-card">
      <h2 className="crm-font-display mb-2 text-lg font-semibold text-brand-brown">
        {t("party_cases.section_progress")}
      </h2>
      <p className="mb-4 text-sm text-sage-700">{t("party_cases.progress_intro")}</p>

      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs font-medium text-sage-600">
          <span>{t("party_cases.progress_label")}</span>
          <span className="tabular-nums">
            {curIdx >= 0 ? `${curIdx + 1} / ${CANONICAL_CASE_STAGES.length}` : "—"}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-sage-200/90">
          <div
            className="h-full rounded-full bg-brand-brown transition-[width] duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      </div>

      {processStatus && !isCanonicalCaseStage(processStatus) ? (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {t("party_cases.progress_unknown_stage", { stage: processStatus })}
        </p>
      ) : null}

      <ol className="space-y-2">
        {CANONICAL_CASE_STAGES.map((stage, i) => {
          const done = curIdx >= 0 && i < curIdx;
          const current = curIdx >= 0 && i === curIdx;
          const upcoming = curIdx < 0 || i > curIdx;
          return (
            <li
              key={stage}
              className={[
                "flex items-start gap-3 rounded-md px-2 py-2 text-sm",
                current ? "bg-sage-100/90 font-semibold text-sage-900" : "",
                done ? "text-sage-800" : "",
                upcoming ? "text-sage-500" : "",
              ].join(" ")}
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {done ? (
                  <Check className="h-4 w-4 text-emerald-700" aria-hidden strokeWidth={2} />
                ) : current ? (
                  <Circle className="h-3.5 w-3.5 fill-brand-brown text-brand-brown" aria-hidden strokeWidth={2} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-sage-400" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">{translateProcessStatus(stage, tStage) || stage}</span>
                {current ? (
                  <span className="mt-0.5 block text-xs font-medium text-brand-brown">
                    {t("party_cases.progress_current")}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
