"use client";

import { Check, Circle, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getFieldsForStage } from "@/constants/am-stage-field-groups";
import {
  CANONICAL_CASE_STAGES,
  canonicalStageIndex,
  isCanonicalCaseStage,
  type CanonicalCaseStage,
} from "@/constants/case-stages";
import type { CaseFileRow } from "@/lib/case-manager/case-files";
import type { AmWorkspacePayload } from "@/lib/case-manager/am-workspace-model";
import { isAmStageFieldVisible } from "@/lib/case-manager/am-workspace-model";
import { translateAmStageFieldLabel } from "@/lib/i18n/translate-am-stage-field";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";

function formatDt(iso: string, lng: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return lng.toLowerCase().startsWith("zh")
      ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(d)
      : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
  } catch {
    return iso;
  }
}

function stageFilledRows(
  stage: CanonicalCaseStage,
  stageData: AmWorkspacePayload | undefined,
  language: string,
) {
  const row = stageData?.byStage[stage] ?? {};
  return getFieldsForStage(stage)
    .filter((def) => !def.internalOnly && isAmStageFieldVisible(def, row))
    .map((def) => {
      const value = String(row[def.key] ?? "").trim();
      return { key: def.key, label: translateAmStageFieldLabel(def, language), value };
    })
    .filter((r) => r.value);
}

export function PartyCaseProgressTimeline({
  processStatus,
  stageData,
  caseId,
  apiBase,
}: {
  processStatus: string | null;
  stageData?: AmWorkspacePayload;
  caseId?: string;
  apiBase?: string;
}) {
  const { t, i18n } = useTranslation("portal");
  const { t: tStage } = useTranslation("caseStage");
  const [files, setFiles] = useState<CaseFileRow[]>([]);

  useEffect(() => {
    if (!caseId || !apiBase) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/${encodeURIComponent(caseId)}/files`);
        if (!res.ok) return;
        const json = (await res.json()) as { files?: CaseFileRow[] };
        if (!cancelled) setFiles(json.files ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase, caseId]);

  const curIdx = processStatus && isCanonicalCaseStage(processStatus) ? canonicalStageIndex(processStatus) : -1;
  const progressPct =
    curIdx >= 0 ? Math.round(((curIdx + 1) / CANONICAL_CASE_STAGES.length) * 100) : 0;

  const categoryLabel = (cat: string) =>
    t(`case_detail.files.category_${cat}`, { defaultValue: cat });

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
                {(() => {
                  if (upcoming) return null;
                  const rows = stageFilledRows(stage, stageData, i18n.language);
                  if (rows.length === 0) {
                    return current ? (
                      <p className="mt-2 text-xs font-normal text-sage-600">
                        {t("party_cases.progress_fields_empty")}
                      </p>
                    ) : null;
                  }
                  return (
                    <dl className="mt-2 grid gap-1.5 text-xs font-normal text-sage-800 sm:grid-cols-2">
                      {rows.map((r) => (
                        <div key={r.key}>
                          <dt className="text-[11px] font-semibold text-sage-600">{r.label}</dt>
                          <dd className="break-words text-sage-900">{r.value}</dd>
                        </div>
                      ))}
                    </dl>
                  );
                })()}
              </span>
            </li>
          );
        })}
      </ol>

      {caseId && apiBase ? (
        <div className="mt-5 border-t border-sage-200/80 pt-4">
          <h3 className="mb-1 text-sm font-semibold text-sage-900">
            {t("party_cases.progress_docs_title")}
          </h3>
          <p className="mb-3 text-xs text-sage-600">{t("party_cases.progress_docs_intro")}</p>
          {files.length === 0 ? (
            <p className="text-sm text-sage-600">{t("party_cases.progress_docs_empty")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-sage-50/80 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sage-900">{categoryLabel(f.category)}</p>
                    {f.note ? <p className="text-xs text-sage-600">{f.note}</p> : null}
                    <p className="text-xs text-sage-500">{formatDt(f.created_at, i18n.language)}</p>
                  </div>
                  {f.file_url ? (
                    <a
                      href={f.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-brown underline"
                    >
                      {t("case_detail.open_file")}
                      <ExternalLink className="h-3 w-3" aria-hidden strokeWidth={2} />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
