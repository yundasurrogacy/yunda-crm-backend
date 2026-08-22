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
import { isAmStageFieldRequired } from "@/lib/case-manager/am-stage-field-required";
import {
  isAmStageFieldVisible,
  mergeStageFields,
} from "@/lib/case-manager/am-workspace-model";
import { translateAmStageFieldLabel } from "@/lib/i18n/translate-am-stage-field";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";
import { isValidMmDdYyyy, maskMmDdYyyyInput, normalizeToMmDdYyyy } from "@/lib/case-manager/mm-dd-yyyy";

type Props = {
  caseId: string;
  detail: AmCaseDetail;
  onDetailUpdated: (d: AmCaseDetail) => void;
  /** 默认 CM；Admin 详情页传入 `/api/admin/cases` */
  apiPathBase?: string;
  /** 阶段切换用的页面路径前缀，默认 `/case_manager/cases` */
  casesPageBase?: string;
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
  if (t === "Select" && def.options && def.options.length > 0) {
    return (
      <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {def.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  if (t === "Long text") {
    return (
      <textarea {...common} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }
  if (t === "Date") {
    const invalid = value.trim() !== "" && !isValidMmDdYyyy(value.trim());
    return (
      <div>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          {...common}
          className={[fieldInputClass(disabled), invalid ? "border-amber-500 focus:border-amber-600 focus:ring-amber-600" : ""].join(" ")}
          placeholder="MM-DD-YYYY"
          value={value}
          onChange={(e) => onChange(maskMmDdYyyyInput(e.target.value))}
          onBlur={() => {
            const n = normalizeToMmDdYyyy(value);
            if (n !== value) onChange(n);
          }}
          aria-invalid={invalid}
        />
        {invalid ? (
          <p className="mt-1 text-[11px] text-amber-800">MM-DD-YYYY</p>
        ) : null}
      </div>
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
  if (/\bCurrency\b/i.test(t)) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-sage-500">$</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          {...common}
          className={`${fieldInputClass(disabled)} pl-7`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  return <input type="text" autoComplete="off" {...common} value={value} onChange={(e) => onChange(e.target.value)} />;
}

function CaseManagerAmWorkspacePanelInner({
  caseId,
  detail,
  onDetailUpdated,
  apiPathBase = "/api/case-manager/cases",
  casesPageBase = "/case_manager/cases",
}: Props) {
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
      router.replace(`${casesPageBase}/${encodeURIComponent(caseId)}?${q.toString()}`, { scroll: false });
    },
    [caseId, casesPageBase, router, searchParams],
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
    isCanonicalCaseStage(processStatus) && selectedStage === processStatus;

  const incompleteForCurrentStage = useMemo(() => {
    if (!isCanonicalCaseStage(processStatus) || selectedStage !== processStatus) return [];
    return listIncompleteFieldDefs(processStatus, mergedForAdvanceCheck);
  }, [processStatus, selectedStage, mergedForAdvanceCheck]);

  const selectedVisibleFilled = useMemo(() => {
    const visible = fieldDefs.filter((f) => isAmStageFieldVisible(f, form));
    if (visible.length === 0) return true;
    return visible.every((f) => String(form[f.key] ?? "").trim() !== "");
  }, [fieldDefs, form]);

  const buildPatch = () => {
    const patch: Record<string, string> = {};
    for (const d of fieldDefs) patch[d.key] = (form[d.key] ?? "").trim();
    return patch;
  };

  const patchDetail = async (body: Record<string, unknown>) => {
    setErrorKey(null);
    const res = await fetch(`${apiPathBase}/${encodeURIComponent(caseId)}`, {
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
      <p className="mb-2 text-sm text-sage-700">{t("case_detail.am_workspace.section_intro")}</p>
      <p className="mb-4 rounded-md border border-sage-200/90 bg-sage-50/80 px-3 py-2 text-xs text-sage-700">
        {t("case_detail.am_workspace.profile_fields_hint")}
      </p>

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
              const done = i < curIdxForLock;
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
            {selectedVisibleFilled ? (
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                {t("case_detail.am_workspace.badge_complete")}
              </span>
            ) : (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                {t("case_detail.am_workspace.badge_partial")}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {fieldDefs.length === 0 ? (
              <p className="text-sm text-sage-600">{t("case_detail.am_workspace.empty_fields")}</p>
            ) : (
              fieldDefs
                .filter((def) => isAmStageFieldVisible(def, form))
                .map((def) => (
                <div key={def.key}>
                  <label htmlFor={`am-${caseId}-${def.key}`} className="block text-xs font-semibold uppercase tracking-wide text-sage-600">
                    {translateAmStageFieldLabel(def, i18n.language)}
                    {isAmStageFieldRequired(def) ? (
                      <span className="ml-1 text-red-600" aria-hidden>
                        *
                      </span>
                    ) : (
                      <span className="ml-1 font-normal normal-case text-sage-500">
                        ({t("case_detail.am_workspace.optional")})
                      </span>
                    )}
                    {def.internalOnly ? (
                      <span className="ml-2 rounded bg-sage-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-sage-700">
                        {t("case_detail.am_workspace.badge_internal")}
                      </span>
                    ) : null}
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
                advancing
              }
              onClick={() => void onAdvance()}
              title={t("case_detail.am_workspace.next_hint_incomplete")}
              className="ami-ui rounded-md border border-brand-brown bg-brand-brown px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {advancing ? t("case_detail.am_workspace.advancing") : t("case_detail.am_workspace.next_stage")}
            </button>
          </div>

          {canAdvanceFromDraft && !selectedVisibleFilled ? (
            <p className="text-xs text-sage-600">{t("case_detail.am_workspace.next_hint_incomplete")}</p>
          ) : null}
          {incompleteForCurrentStage.length > 0 ? (
            <div className="space-y-2 text-xs text-amber-900">
              <p className="font-medium">
                {t("case_detail.workflow.missing_fields_hint", {
                  total: getFieldsForStage(processStatus).filter(isAmStageFieldRequired).length,
                  count: incompleteForCurrentStage.length,
                })}
              </p>
              <ul className="list-inside list-disc">
                {incompleteForCurrentStage.slice(0, 12).map((f) => (
                  <li key={f.key}>{translateAmStageFieldLabel(f, i18n.language)}</li>
                ))}
              </ul>
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
