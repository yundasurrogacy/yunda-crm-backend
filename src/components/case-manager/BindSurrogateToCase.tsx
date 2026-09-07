"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { EntitySearchSelect } from "@/components/ui/EntitySearchSelect";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Option = { id: string; label: string };

export function BindSurrogateToCase({
  caseId,
  apiCasesBase,
  onBound,
  mode = "match",
  excludeSurrogateId,
}: {
  caseId: string;
  /** `/api/case-manager/cases` 或 `/api/admin/cases` */
  apiCasesBase: string;
  onBound: () => void;
  /** match=首次绑定；replace=换绑（旧 GC 立刻失权） */
  mode?: "match" | "replace";
  /** 换绑时排除当前已绑定的代孕母 */
  excludeSurrogateId?: string | null;
}) {
  const { t } = useTranslation("portal");
  const confirm = useConfirm();
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [wantOptions, setWantOptions] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadedOptions, setLoadedOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const res = await fetch(`${apiCasesBase}?options=gc`);
      if (!res.ok) throw new Error("load");
      const json = (await res.json()) as { surrogates?: Option[] };
      const exclude = excludeSurrogateId?.trim() ?? "";
      const list = (json.surrogates ?? []).filter((o) => !exclude || o.id !== exclude);
      setOptions(list);
      setLoadedOptions(true);
    } catch {
      setOptions([]);
      setLoadedOptions(true);
    } finally {
      setLoadingOptions(false);
    }
  }, [apiCasesBase, excludeSurrogateId]);

  useEffect(() => {
    // 未绑定 GC：绑定区默认展开，进页即可拉列表。换绑在折叠档案里，点开搜索再拉。
    if (mode === "replace" && !wantOptions) return;
    void loadOptions();
  }, [mode, wantOptions, loadOptions]);

  async function handleBind() {
    if (!selectedId.trim()) return;
    if (mode === "replace") {
      const ok = await confirm({
        message: t("case_detail.replace_gc_confirm"),
        danger: true,
      });
      if (!ok) return;
    }
    setSubmitting(true);
    setErrorKey(null);
    try {
      const res = await fetch(`${apiCasesBase}/${encodeURIComponent(caseId)}/actions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "replace" ? "replace_gc" : "match_gc",
          surrogateId: selectedId.trim(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 409 && json.error === "surrogate_has_case") {
        setErrorKey("case_detail.bind_gc_error_taken");
        return;
      }
      if (res.status === 409 && json.error === "same_surrogate") {
        setErrorKey("case_detail.replace_gc_error_same");
        return;
      }
      if (!res.ok) {
        setErrorKey(mode === "replace" ? "case_detail.replace_gc_error" : "case_detail.bind_gc_error");
        return;
      }
      onBound();
    } catch {
      setErrorKey(mode === "replace" ? "case_detail.replace_gc_error" : "case_detail.bind_gc_error");
    } finally {
      setSubmitting(false);
    }
  }

  const titleKey = mode === "replace" ? "case_detail.replace_gc_title" : "case_detail.bind_gc_title";
  const introKey = mode === "replace" ? "case_detail.replace_gc_intro" : "case_detail.bind_gc_intro";
  const confirmKey =
    mode === "replace" ? "case_detail.replace_gc_submit" : "case_detail.bind_gc_confirm";
  const submittingKey =
    mode === "replace" ? "case_detail.replace_gc_submitting" : "case_detail.bind_gc_submitting";

  return (
    <div className="mt-3 rounded-lg border border-dashed border-sage-300/90 bg-sage-50/60 p-4">
      <p className="text-sm font-medium text-sage-800">{t(titleKey)}</p>
      {mode === "replace" ? (
        <div className="mt-2">
          <p className="text-xs font-semibold text-brand-brown">{t("case_detail.replace_gc_steps")}</p>
          <ol className="mt-2 grid gap-2 text-xs text-sage-700 sm:grid-cols-3">
            <li className="rounded-md border border-sage-200 bg-white/80 px-2.5 py-2">
              <span className="font-semibold text-brand-brown">1. </span>
              {t("case_detail.replace_gc_step1")}
            </li>
            <li className="rounded-md border border-sage-200 bg-white/80 px-2.5 py-2">
              <span className="font-semibold text-brand-brown">2. </span>
              {t("case_detail.replace_gc_step2")}
            </li>
            <li className="rounded-md border border-sage-200 bg-white/80 px-2.5 py-2">
              <span className="font-semibold text-brand-brown">3. </span>
              {t("case_detail.replace_gc_step3")}
            </li>
          </ol>
        </div>
      ) : null}
      <p className="mt-2 text-xs text-sage-600">{t(introKey)}</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className="sr-only" htmlFor={`bind-gc-${mode}-${caseId}`}>
            {t("case_detail.bind_gc_pick")}
          </label>
          <EntitySearchSelect
            id={`bind-gc-${mode}-${caseId}`}
            options={options}
            value={selectedId}
            onChange={setSelectedId}
            disabled={submitting}
            loading={loadingOptions}
            onOpenChange={(open) => {
              if (open) setWantOptions(true);
            }}
            placeholder={
              loadingOptions ? t("case_detail.bind_gc_loading") : t("case_detail.bind_gc_search_ph")
            }
            emptyLabel={t("case_detail.bind_gc_pick")}
            allowEmpty
          />
        </div>
        <button
          type="button"
          disabled={!selectedId || submitting}
          onClick={() => void handleBind()}
          className="crm-btn crm-btn-primary"
        >
          {submitting ? t(submittingKey) : t(confirmKey)}
        </button>
      </div>
      {loadedOptions && !loadingOptions && options.length === 0 ? (
        <p className="mt-2 text-xs text-sage-600">{t("case_detail.bind_gc_no_options")}</p>
      ) : null}
      {errorKey ? <p className="mt-2 text-xs text-red-700">{t(errorKey)}</p> : null}
    </div>
  );
}
