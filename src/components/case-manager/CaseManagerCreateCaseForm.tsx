"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CANONICAL_CASE_STAGES } from "@/constants/case-stages";
import { EntitySearchSelect } from "@/components/ui/EntitySearchSelect";
import { translateProcessStatus } from "@/lib/i18n/translate-process-status";

type Option = { id: string; label: string };

export function CaseManagerCreateCaseForm() {
  const { t } = useTranslation("portal");
  const { t: tStage } = useTranslation("caseStage");
  const [intendedParents, setIntendedParents] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgIsError, setMsgIsError] = useState(false);
  const [form, setForm] = useState<{
    intendedParentId: string;
    processStatus: string;
  }>({
    intendedParentId: "",
    processStatus: CANONICAL_CASE_STAGES[0]!,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/case-manager/cases?options=1");
        if (!res.ok) throw new Error("load_failed");
        const json = (await res.json()) as {
          intendedParents: Option[];
          defaultStage?: string;
        };
        if (cancelled) return;
        setIntendedParents(json.intendedParents ?? []);
        setForm((prev) => ({
          ...prev,
          intendedParentId: json.intendedParents?.[0]?.id ?? "",
          processStatus:
            json.defaultStage &&
            CANONICAL_CASE_STAGES.includes(json.defaultStage as (typeof CANONICAL_CASE_STAGES)[number])
              ? json.defaultStage
              : prev.processStatus,
        }));
      } catch {
        if (!cancelled) {
          setMsgIsError(true);
          setMsg(t("cm_case.error_load_options"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setMsgIsError(false);
    setSaving(true);
    try {
      const res = await fetch("/api/case-manager/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { id?: string; error?: string; detail?: string };
      if (!res.ok) {
        setMsgIsError(true);
        if (json.error === "case_manager_not_bound") {
          setMsg(t("cm_case.error_case_manager_not_bound"));
        } else if (json.error === "surrogate_has_case") {
          setMsg(t("cm_case.error_unique_surrogate"));
        } else if (json.detail) {
          setMsg(`${t("cm_case.error_create_detail_prefix")}${json.detail}`);
        } else {
          setMsg(t("cm_case.error_create"));
        }
        return;
      }
      setMsgIsError(false);
      setMsg(t("cm_case.success_created", { id: json.id ?? "" }));
    } catch {
      setMsgIsError(true);
      setMsg(t("cm_case.error_create"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6">
      <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t("cm_case.create_title")}</h1>
      <p className="mt-1 text-sm text-sage-700">{t("cm_case.create_intro")}</p>
      {loading ? <p className="mt-4 text-sm text-sage-600">{t("cm_case.loading_options")}</p> : null}
      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sage-600">
            {t("cm_case.intended_parent")}
          </span>
          <EntitySearchSelect
            options={intendedParents}
            value={form.intendedParentId}
            onChange={(id) => setForm((p) => ({ ...p, intendedParentId: id }))}
            placeholder={t("entity_search.placeholder")}
            disabled={loading || saving}
            allowEmpty={false}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sage-600">
            {t("cm_case.initial_stage")}
          </span>
          <select
            className="w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
            value={form.processStatus}
            onChange={(e) => setForm((p) => ({ ...p, processStatus: e.target.value }))}
          >
            {CANONICAL_CASE_STAGES.map((s) => (
              <option key={s} value={s}>
                {translateProcessStatus(s, tStage)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={saving || loading || !form.intendedParentId}
          className="rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? t("cm_case.creating") : t("cm_case.create_submit")}
        </button>
      </form>
      {msg ? (
        <p className={`mt-4 text-sm ${msgIsError ? "text-red-800" : "text-emerald-900"}`}>{msg}</p>
      ) : null}
    </section>
  );
}
