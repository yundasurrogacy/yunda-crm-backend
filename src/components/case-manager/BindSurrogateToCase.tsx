"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type Option = { id: string; label: string };

export function BindSurrogateToCase({
  caseId,
  apiCasesBase,
  onBound,
}: {
  caseId: string;
  /** `/api/case-manager/cases` 或 `/api/admin/cases` */
  apiCasesBase: string;
  onBound: () => void;
}) {
  const { t } = useTranslation("portal");
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const res = await fetch(`${apiCasesBase}?options=gc`);
      if (!res.ok) throw new Error("load");
      const json = (await res.json()) as { surrogates?: Option[] };
      setOptions(json.surrogates ?? []);
    } catch {
      setOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  }, [apiCasesBase]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  async function handleBind() {
    if (!selectedId.trim()) return;
    setSubmitting(true);
    setErrorKey(null);
    try {
      const res = await fetch(`${apiCasesBase}/${encodeURIComponent(caseId)}/actions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "match_gc", surrogateId: selectedId.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 409 && json.error === "surrogate_has_case") {
        setErrorKey("case_detail.bind_gc_error_taken");
        return;
      }
      if (!res.ok) {
        setErrorKey("case_detail.bind_gc_error");
        return;
      }
      onBound();
    } catch {
      setErrorKey("case_detail.bind_gc_error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-sage-300/90 bg-sage-50/60 p-4">
      <p className="text-sm font-medium text-sage-800">{t("case_detail.bind_gc_title")}</p>
      <p className="mt-1 text-xs text-sage-600">{t("case_detail.bind_gc_intro")}</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className="sr-only" htmlFor={`bind-gc-${caseId}`}>
            {t("case_detail.bind_gc_pick")}
          </label>
          <select
            id={`bind-gc-${caseId}`}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={loadingOptions || submitting}
            className="crm-font-ui block w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm text-sage-900"
          >
            <option value="">
              {loadingOptions ? t("case_detail.bind_gc_loading") : t("case_detail.bind_gc_pick")}
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!selectedId || submitting}
          onClick={() => void handleBind()}
          className="rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
        >
          {submitting ? t("case_detail.bind_gc_submitting") : t("case_detail.bind_gc_confirm")}
        </button>
      </div>
      {!loadingOptions && options.length === 0 ? (
        <p className="mt-2 text-xs text-sage-600">{t("case_detail.bind_gc_no_options")}</p>
      ) : null}
      {errorKey ? <p className="mt-2 text-xs text-red-700">{t(errorKey)}</p> : null}
    </div>
  );
}
