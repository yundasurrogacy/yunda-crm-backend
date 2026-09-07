"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { EntitySearchSelect, type EntitySearchOption } from "@/components/ui/EntitySearchSelect";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type ManagerRow = {
  entityId: string;
  email: string;
  isPrimary: boolean;
  deleted: boolean;
};

export function AdminCaseManagersPanel({ caseId }: { caseId: string }) {
  const { t } = useTranslation("portal");
  const confirm = useConfirm();
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [options, setOptions] = useState<EntitySearchOption[]>([]);
  const [primaryPickId, setPrimaryPickId] = useState("");
  const [auxPickId, setAuxPickId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [listRes, optRes] = await Promise.all([
        fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/case-managers`),
        fetch("/api/admin/cases?options=1"),
      ]);
      if (!listRes.ok) throw new Error("list");
      const listJson = (await listRes.json()) as { managers?: ManagerRow[] };
      setManagers(listJson.managers ?? []);
      if (optRes.ok) {
        const optJson = (await optRes.json()) as { caseManagers?: EntitySearchOption[] };
        setOptions(optJson.caseManagers ?? []);
      }
    } catch {
      setError(true);
      setManagers([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const primary = useMemo(() => managers.find((m) => m.isPrimary) ?? null, [managers]);
  const auxiliaries = useMemo(() => managers.filter((m) => !m.isPrimary), [managers]);
  const assignedIds = useMemo(() => new Set(managers.map((m) => m.entityId)), [managers]);

  const primaryOptions = useMemo(
    () => options.filter((o) => o.id !== primary?.entityId),
    [options, primary?.entityId],
  );
  const auxOptions = useMemo(
    () => options.filter((o) => !assignedIds.has(o.id)),
    [options, assignedIds],
  );

  async function postAction(action: "add" | "set_primary" | "remove", caseManagerId: string) {
    const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/case-managers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, caseManagerId }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      managers?: ManagerRow[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(json.error ?? "failed");
    }
    setManagers(json.managers ?? []);
    return json;
  }

  async function onSetOrChangePrimary() {
    if (!primaryPickId || busyKey) return;
    setBusyKey("primary");
    setMessage(null);
    try {
      await postAction("set_primary", primaryPickId);
      setPrimaryPickId("");
      setMessage(
        primary ? t("case_detail.cm_primary_changed") : t("case_detail.cm_primary_set"),
      );
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setMessage(
        code === "case_manager_not_found"
          ? t("case_detail.cm_error_not_found")
          : t("case_detail.cm_error"),
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function onAddAuxiliary() {
    if (!auxPickId || busyKey) return;
    setBusyKey("add");
    setMessage(null);
    try {
      await postAction("add", auxPickId);
      setAuxPickId("");
      setMessage(t("case_detail.cm_aux_added"));
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setMessage(
        code === "already_primary"
          ? t("case_detail.cm_error_already_primary")
          : t("case_detail.cm_error"),
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function onRemoveAuxiliary(entityId: string) {
    if (busyKey) return;
    if (!(await confirm({ message: t("case_detail.cm_remove_aux_confirm"), danger: true }))) return;
    setBusyKey(`rm-${entityId}`);
    setMessage(null);
    try {
      await postAction("remove", entityId);
      setMessage(t("case_detail.cm_aux_removed"));
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setMessage(
        code === "cannot_remove_primary"
          ? t("case_detail.cm_error_cannot_remove_primary")
          : t("case_detail.cm_error"),
      );
    } finally {
      setBusyKey(null);
    }
  }

  const summary = loading
    ? t("case_detail.cm_loading")
    : primary
      ? `${primary.email || "—"} · ${t("case_detail.cm_primary_heading")}${
          auxiliaries.length > 0 ? ` · +${auxiliaries.length}` : ""
        }`
      : t("case_detail.cm_primary_empty");

  return (
    <CollapsibleCard
      title={t("case_detail.section_case_managers")}
      summary={summary}
      defaultOpen={false}
      storageKey={`crm-case-detail-cm-${caseId}`}
    >
      <p className="mb-4 text-sm text-sage-700">{t("case_detail.cm_intro")}</p>
      {loading ? <p className="text-sm text-sage-600">{t("case_detail.cm_loading")}</p> : null}
      {error ? <p className="text-sm text-red-700">{t("case_detail.cm_error_load")}</p> : null}

      {!loading && !error ? (
        <div className="space-y-6">
          {/* 主负责：设置 / 更改 */}
          <div className="rounded-lg border border-sage-200/80 bg-white p-5">
            <h3 className="text-sm font-semibold text-sage-900">{t("case_detail.cm_primary_heading")}</h3>
            <p className="mt-1 text-sm text-sage-800">
              {primary ? (
                <>
                  <span className="font-medium break-all">{primary.email || "—"}</span>
                  <span className="ml-2 tabular-nums text-sage-600">#{primary.entityId}</span>
                  {primary.deleted ? (
                    <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-800">
                      {t("case_detail.cm_deleted_badge")}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-sage-600">{t("case_detail.cm_primary_empty")}</span>
              )}
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-medium text-sage-700">
                <span>
                  {primary
                    ? t("case_detail.cm_change_primary_label")
                    : t("case_detail.cm_set_primary_label")}
                </span>
                <EntitySearchSelect
                  options={primaryOptions}
                  value={primaryPickId}
                  onChange={setPrimaryPickId}
                  placeholder={t("entity_search.placeholder")}
                  emptyLabel={t("case_detail.cm_pick")}
                  allowEmpty
                />
              </label>
              <button
                type="button"
                disabled={busyKey !== null || !primaryPickId}
                onClick={() => void onSetOrChangePrimary()}
                className="crm-btn crm-btn-primary crm-btn-sm"
              >
                {busyKey === "primary"
                  ? t("case_detail.cm_saving")
                  : primary
                    ? t("case_detail.cm_btn_change_primary")
                    : t("case_detail.cm_btn_set_primary")}
              </button>
            </div>
          </div>

          {/* 辅助：添加 / 移除 */}
          <div className="rounded-lg border border-sage-200/80 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-sage-900">
              {t("case_detail.cm_aux_heading")}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-sage-200/80">
              <table className="w-full min-w-[24rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-sage-200 bg-sage-100 text-xs font-semibold uppercase tracking-wide text-sage-700">
                    <th className="px-4 py-3">{t("case_detail.cm_col_id")}</th>
                    <th className="px-4 py-3">{t("case_detail.cm_col_email")}</th>
                    <th className="px-4 py-3">{t("case_detail.cm_col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {auxiliaries.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-5 text-sage-600">
                        {t("case_detail.cm_aux_empty")}
                      </td>
                    </tr>
                  ) : (
                    auxiliaries.map((m) => (
                      <tr
                        key={m.entityId}
                        className={[
                          "border-b border-sage-100",
                          m.deleted ? "bg-sage-50/80 text-sage-500" : "",
                        ].join(" ")}
                      >
                        <td className="px-4 py-3 tabular-nums">{m.entityId}</td>
                        <td className="px-4 py-3 break-all">
                          {m.email || "—"}
                          {m.deleted ? (
                            <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-800">
                              {t("case_detail.cm_deleted_badge")}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() => void onRemoveAuxiliary(m.entityId)}
                            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
                          >
                            {t("case_detail.cm_btn_remove_aux")}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-medium text-sage-700">
                <span>{t("case_detail.cm_add_aux_label")}</span>
                <EntitySearchSelect
                  options={auxOptions}
                  value={auxPickId}
                  onChange={setAuxPickId}
                  placeholder={t("entity_search.placeholder")}
                  emptyLabel={t("case_detail.cm_pick")}
                  allowEmpty
                />
              </label>
              <button
                type="button"
                disabled={busyKey !== null || !auxPickId}
                onClick={() => void onAddAuxiliary()}
                className="rounded-md border border-sage-600 bg-sage-50 px-3 py-2 text-sm font-semibold text-sage-900 hover:bg-sage-100 disabled:opacity-50"
              >
                {busyKey === "add" ? t("case_detail.cm_adding") : t("case_detail.cm_btn_add_aux")}
              </button>
            </div>
          </div>

          {message ? <p className="text-xs text-sage-800">{message}</p> : null}
        </div>
      ) : null}
    </CollapsibleCard>
  );
}
