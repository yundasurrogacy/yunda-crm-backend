"use client";

import { Check, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AmQiniuFileInput } from "@/components/case-manager/AmQiniuFileInput";
import { getFieldsForStage } from "@/constants/am-stage-field-groups";
import {
  CANONICAL_CASE_STAGES,
  canonicalStageIndex,
  isCanonicalCaseStage,
} from "@/constants/case-stages";
import { listIncompleteFieldDefs } from "@/lib/case-manager/stage-completion";
import type { AmStageFieldDef } from "@/constants/am-stage-fields-types";
import type { AmCaseDetail } from "@/lib/case-manager/fetch-case-detail";
import { isAmStageFileUploadField } from "@/lib/case-manager/am-stage-file-field";
import { isStageComplete, mergeStageFields } from "@/lib/case-manager/am-workspace-model";
import { translateAmStageFieldLabel } from "@/lib/i18n/translate-am-stage-field";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";

type Props = {
  caseId: string;
  detail: AmCaseDetail;
  onDetailUpdated: (d: AmCaseDetail) => void;
};

function fieldInputClass(disabled: boolean) {
  return [
    "crm-font-ui block w-full rounded-md border border-sage-300/90 bg-white px-3 py-2 text-sm text-sage-900 shadow-sm",
    "placeholder:text-sage-400 focus:border-brand-brown focus:outline-none focus:ring-1 focus:ring-brand-brown",
    disabled ? "cursor-not-allowed bg-sage-100/80 opacity-80" : "",
  ].join(" ");
}

function FieldControl({
  caseId,
  def,
  value,
  onChange,
  disabled,
}: {
  caseId: string;
  def: AmStageFieldDef;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  if (isAmStageFileUploadField(def)) {
    return (
      <AmQiniuFileInput
        inputId={`am-${caseId}-${def.key}`}
        caseId={caseId}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  const common = { disabled, className: fieldInputClass(disabled) };
  const t = def.type.trim();
  if (t === "Long text") {
    return (
      <textarea {...common} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }
  if (t === "Date") {
    return (
      <input type="text" inputMode="numeric" {...common} placeholder="YYYY-MM-DD" value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }
  if (t === "Email") {
    return (
      <input type="email" autoComplete="off" {...common} value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }
  if (t === "Phone") {
    return (
      <input type="tel" autoComplete="off" {...common} value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }
  return <input type="text" autoComplete="off" {...common} value={value} onChange={(e) => onChange(e.target.value)} />;
}

function CaseManagerAmWorkspacePanelInner({ caseId, detail, onDetailUpdated }: Props) {
  const { t } = useTranslation("portal");
  const { t: tStage } = useTranslation("caseStage");
  const { i18n } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const processStatus = detail.process_status ?? "";
  const curIdx = isCanonicalCaseStage(processStatus) ? canonicalStageIndex(processStatus) : -1;
  const curIdxForLock = curIdx >= 0 ? curIdx : 0;

  const phaseParam = searchParams.get("phase");
  const selectedStage = useMemo(() => {
    if (phaseParam && isCanonicalCaseStage(phaseParam)) return phaseParam;
    if (isCanonicalCaseStage(processStatus)) return processStatus;
    return CANONICAL_CASE_STAGES[0]!;
  }, [phaseParam, processStatus]);

  const fieldDefs = useMemo(() => getFieldsForStage(selectedStage), [selectedStage]);
  const selectedIdx = canonicalStageIndex(selectedStage);

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    const row = detail.stage_data.byStage[selectedStage as (typeof CANONICAL_CASE_STAGES)[number]] ?? {};
    const next: Record<string, string> = {};
    for (const d of fieldDefs) next[d.key] = String(row[d.key] ?? "").trim();
    setForm(next);
  }, [detail.stage_data, selectedStage, fieldDefs, detail.id]);

  const setPhase = useCallback(
    (stage: string) => {
      const q = new URLSearchParams(searchParams.toString());
      q.set("phase", stage);
      router.replace(`/case_manager/cases/${encodeURIComponent(caseId)}?${q.toString()}`, { scroll: false });
    },
    [caseId, router, searchParams],
  );

  const isFuture = selectedIdx > curIdxForLock;
  const canEdit = !isFuture;
  const patchForCurrentStage = useMemo(() => {
    if (!isCanonicalCaseStage(processStatus) || selectedStage !== processStatus) return {};
    const defs = getFieldsForStage(processStatus);
    const p: Record<string, string> = {};
    for (const d of defs) p[d.key] = (form[d.key] ?? "").trim();
    return p;
  }, [processStatus, selectedStage, form]);
  const mergedForAdvanceCheck = useMemo(() => {
    if (!isCanonicalCaseStage(processStatus) || selectedStage !== processStatus) return detail.stage_data;
    return mergeStageFields(detail.stage_data, processStatus, patchForCurrentStage);
  }, [detail.stage_data, processStatus, selectedStage, patchForCurrentStage]);

  const canAdvanceFromDraft =
    isCanonicalCaseStage(processStatus) &&
    selectedStage === processStatus &&
    isStageComplete(processStatus, mergedForAdvanceCheck, getFieldsForStage(processStatus));

  const incompleteForCurrentStage = useMemo(() => {
    if (!isCanonicalCaseStage(processStatus) || selectedStage !== processStatus) return [];
    return listIncompleteFieldDefs(processStatus, mergedForAdvanceCheck);
  }, [processStatus, selectedStage, mergedForAdvanceCheck]);

  const selectedComplete = isStageComplete(selectedStage, detail.stage_data, fieldDefs);

  const buildPatch = () => {
    const patch: Record<string, string> = {};
    for (const d of fieldDefs) patch[d.key] = (form[d.key] ?? "").trim();
    return patch;
  };

  const patchDetail = async (body: Record<string, unknown>) => {
    setErrorKey(null);
    const res = await fetch(`/api/case-manager/cases/${encodeURIComponent(caseId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (res.status === 401) {
      setErrorKey("case_detail.error_unauthorized");
      return;
    }
    if (res.status === 403) {
      setErrorKey("case_detail.am_workspace.error_stage_locked");
      return;
    }
    if (res.status === 400 && json && typeof json === "object" && "error" in json) {
      const err = (json as { error?: string }).error;
      if (err === "stage_incomplete") setErrorKey("case_detail.am_workspace.error_incomplete");
      else if (err === "already_last_stage") setErrorKey("case_detail.am_workspace.error_last_stage");
      else if (err === "invalid_current_stage") setErrorKey("case_detail.am_workspace.error_bad_flow");
      else if (err === "advance_only_with_current_stage") setErrorKey("case_detail.am_workspace.error_advance_conflict");
      else setErrorKey("case_detail.am_workspace.error_bad_request");
      return;
    }
    if (!res.ok) {
      setErrorKey("case_detail.am_workspace.error_save");
      return;
    }
    if (json && typeof json === "object" && "id" in json) {
      onDetailUpdated(json as AmCaseDetail);
    }
  };

  const onSave = async () => {
    if (!canEdit || saving) return;
    setSaving(true);
    try {
      await patchDetail({ workspace: { stage: selectedStage, fields: buildPatch() } });
    } finally {
      setSaving(false);
    }
  };

  const onAdvance = async () => {
    if (!isCanonicalCaseStage(processStatus) || selectedStage !== processStatus || advancing) return;
    setAdvancing(true);
    try {
      await patchDetail({
        workspace: { stage: processStatus, fields: buildPatch() },
        advance: true,
      });
    } finally {
      setAdvancing(false);
    }
  };

  const progressPct =
    curIdx >= 0 ? Math.round(((curIdx + 1) / CANONICAL_CASE_STAGES.length) * 100) : 0;

  return (
    <section className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm backdrop-blur-[1px] md:p-6">
      <h2 className="crm-font-display mb-3 text-lg font-semibold text-brand-brown">{t("case_detail.am_workspace.section_title")}</h2>
      <p className="mb-4 text-sm text-sage-700">{t("case_detail.am_workspace.section_intro")}</p>

      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs font-medium text-sage-600">
          <span>{t("case_detail.am_workspace.progress_label")}</span>
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

      {errorKey ? <p className="mb-4 text-sm text-red-700">{t(errorKey)}</p> : null}

      {processStatus && !isCanonicalCaseStage(processStatus) ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {t("case_detail.workflow.bad_process_status", { stages: CANONICAL_CASE_STAGES.join(", ") })}
        </p>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="lg:w-56 lg:shrink-0 lg:border-r lg:border-sage-200/80 lg:pr-4" aria-label={t("case_detail.am_workspace.stages_nav")}>
          <ul className="space-y-1">
            {CANONICAL_CASE_STAGES.map((stage, i) => {
              const pastOrCurrent = i <= curIdxForLock;
              const active = stage === selectedStage;
              const defs = getFieldsForStage(stage);
              const done = isStageComplete(stage, detail.stage_data, defs);
              return (
                <li key={stage}>
                  <button
                    type="button"
                    disabled={!pastOrCurrent}
                    onClick={() => pastOrCurrent && setPhase(stage)}
                    className={[
                      "ami-ui flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs leading-snug transition-colors",
                      active ? "bg-sage-200/80 font-semibold text-sage-900" : "text-sage-700 hover:bg-sage-100/80",
                      !pastOrCurrent ? "cursor-not-allowed opacity-50" : "",
                    ].join(" ")}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {!pastOrCurrent ? (
                        <Lock className="h-3.5 w-3.5 text-sage-500" aria-hidden strokeWidth={2} />
                      ) : done ? (
                        <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden strokeWidth={2} />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-sage-400" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">{translateProcessStatus(stage, tStage) || stage}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-sage-200/80 pb-3">
            <h3 className="crm-font-display text-base font-semibold text-brand-brown">
              {translateProcessStatus(selectedStage, tStage) || selectedStage}
            </h3>
            {isFuture ? (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                {t("case_detail.am_workspace.badge_locked")}
              </span>
            ) : null}
            {selectedComplete ? (
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                {t("case_detail.am_workspace.badge_complete")}
              </span>
            ) : null}
          </div>

          <div className="space-y-4">
            {fieldDefs.length === 0 ? (
              <p className="text-sm text-sage-600">{t("case_detail.am_workspace.empty_fields")}</p>
            ) : (
              fieldDefs.map((def) => (
                <div key={def.key}>
                  <label htmlFor={`am-${caseId}-${def.key}`} className="block text-xs font-semibold uppercase tracking-wide text-sage-600">
                    {translateAmStageFieldLabel(def, i18n.language)}
                  </label>
                  <div className="mt-1">
                    <FieldControl
                      caseId={caseId}
                      def={def}
                      value={form[def.key] ?? ""}
                      onChange={(v) => setForm((prev) => ({ ...prev, [def.key]: v }))}
                      disabled={!canEdit || saving || advancing}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={!canEdit || saving || advancing}
              onClick={() => void onSave()}
              className="ami-ui rounded-md border border-sage-400 bg-white px-4 py-2 text-sm font-semibold text-sage-900 shadow-sm hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? t("case_detail.am_workspace.saving") : t("case_detail.am_workspace.save")}
            </button>
            <button
              type="button"
              disabled={
                !isCanonicalCaseStage(processStatus) ||
                selectedStage !== processStatus ||
                !canEdit ||
                saving ||
                advancing ||
                !canAdvanceFromDraft
              }
              onClick={() => void onAdvance()}
              title={!canAdvanceFromDraft ? t("case_detail.am_workspace.next_hint_incomplete") : undefined}
              className="ami-ui rounded-md border border-brand-brown bg-brand-brown px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {advancing ? t("case_detail.am_workspace.advancing") : t("case_detail.am_workspace.next_stage")}
            </button>
          </div>

          {!canAdvanceFromDraft && isCanonicalCaseStage(processStatus) && selectedStage === processStatus ? (
            <div className="space-y-2 text-xs text-sage-600">
              <p>{t("case_detail.am_workspace.next_hint_incomplete")}</p>
              {incompleteForCurrentStage.length > 0 ? (
                <>
                  <p className="font-medium text-amber-900">
                    {t("case_detail.workflow.missing_fields_hint", {
                      total: getFieldsForStage(processStatus).length,
                      count: incompleteForCurrentStage.length,
                    })}
                  </p>
                  <ul className="list-inside list-disc text-sage-700">
                    {incompleteForCurrentStage.slice(0, 12).map((f) => (
                      <li key={f.key}>{translateAmStageFieldLabel(f, i18n.language)}</li>
                    ))}
                  </ul>
                  {incompleteForCurrentStage.length > 12 ? (
                    <p className="text-sage-500">…</p>
                  ) : null}
                  <p className="text-sage-500">{t("case_detail.workflow.scroll_more_fields")}</p>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AmWorkspaceFallback() {
  const { t } = useTranslation("portal");
  return (
    <section className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6">
      <p className="text-sm text-sage-600">{t("case_detail.am_workspace.loading_panel")}</p>
    </section>
  );
}

export function CaseManagerAmWorkspacePanel(props: Props) {
  return (
    <Suspense fallback={<AmWorkspaceFallback />}>
      <CaseManagerAmWorkspacePanelInner {...props} />
    </Suspense>
  );
}
