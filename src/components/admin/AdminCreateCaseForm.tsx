"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CANONICAL_CASE_STAGES } from "@/constants/case-stages";

type Option = { id: string; label: string };

export function AdminCreateCaseForm() {
  const { t } = useTranslation("portal");
  const [caseManagers, setCaseManagers] = useState<Option[]>([]);
  const [intendedParents, setIntendedParents] = useState<Option[]>([]);
  const [surrogates, setSurrogates] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgIsError, setMsgIsError] = useState(false);
  const [form, setForm] = useState<{
    caseManagerId: string;
    intendedParentId: string;
    surrogateId: string;
    processStatus: string;
    trustAccountBalance: string;
  }>({
    caseManagerId: "",
    intendedParentId: "",
    surrogateId: "",
    processStatus: CANONICAL_CASE_STAGES[0]!,
    trustAccountBalance: "0",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/cases?options=1");
        if (!res.ok) throw new Error("load_failed");
        const json = (await res.json()) as {
          caseManagers: Option[];
          intendedParents: Option[];
          surrogates: Option[];
        };
        if (cancelled) return;
        setCaseManagers(json.caseManagers ?? []);
        setIntendedParents(json.intendedParents ?? []);
        setSurrogates(json.surrogates ?? []);
        setForm((prev) => ({
          ...prev,
          caseManagerId: json.caseManagers?.[0]?.id ?? "",
          intendedParentId: json.intendedParents?.[0]?.id ?? "",
          surrogateId: json.surrogates?.[0]?.id ?? "",
        }));
      } catch {
        if (!cancelled) {
          setMsgIsError(true);
          setMsg(t("admin_case.error_load_options"));
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
      const res = await fetch("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { id?: string; error?: string; detail?: string };
      if (!res.ok) {
        setMsgIsError(true);
        if (json.error === "intended_parent_has_case") {
          setMsg(t("admin_case.error_unique_intended_parent"));
        } else if (json.error === "surrogate_has_case") {
          setMsg(t("admin_case.error_unique_surrogate"));
        } else if (json.detail) {
          setMsg(`${t("admin_case.error_create_detail_prefix")}${json.detail}`);
        } else {
          setMsg(t("admin_case.error_create"));
        }
        return;
      }
      setMsgIsError(false);
      setMsg(t("admin_case.success_created", { id: json.id ?? "" }));
    } catch {
      setMsgIsError(true);
      setMsg(t("admin_case.error_create"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6">
      <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t("admin_case.create_title")}</h1>
      <p className="mt-1 text-sm text-sage-700">{t("admin_case.create_intro")}</p>
      {loading ? <p className="mt-4 text-sm text-sage-600">{t("admin_case.loading_options")}</p> : null}
      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sage-600">{t("admin_case.case_manager")}</span>
          <select className="w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm" value={form.caseManagerId} onChange={(e) => setForm((p) => ({ ...p, caseManagerId: e.target.value }))}>
            {caseManagers.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sage-600">{t("admin_case.intended_parent")}</span>
          <select className="w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm" value={form.intendedParentId} onChange={(e) => setForm((p) => ({ ...p, intendedParentId: e.target.value }))}>
            {intendedParents.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sage-600">{t("admin_case.surrogate")}</span>
          <select className="w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm" value={form.surrogateId} onChange={(e) => setForm((p) => ({ ...p, surrogateId: e.target.value }))}>
            {surrogates.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sage-600">{t("admin_case.initial_stage")}</span>
          <select className="w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm" value={form.processStatus} onChange={(e) => setForm((p) => ({ ...p, processStatus: e.target.value }))}>
            {CANONICAL_CASE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sage-600">{t("admin_case.trust_balance")}</span>
          <input className="w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm" value={form.trustAccountBalance} onChange={(e) => setForm((p) => ({ ...p, trustAccountBalance: e.target.value }))} />
        </label>
        <button type="submit" disabled={saving || loading} className="rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? t("admin_case.creating") : t("admin_case.create_submit")}
        </button>
      </form>
      {msg ? (
        <p className={`mt-4 text-sm ${msgIsError ? "text-red-800" : "text-emerald-900"}`}>{msg}</p>
      ) : null}
    </section>
  );
}
