"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AmQiniuFileInput } from "@/components/case-manager/AmQiniuFileInput";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { TrustLedgerEntry } from "@/lib/case-manager/trust-ledger";

type Props = {
  caseId: string;
  apiPathBase: string;
  currentBalance: string;
  onBalanceUpdated: (balance: string) => void;
};

function formatMoney(raw: string, lng: string) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return `$${raw}`;
  return new Intl.NumberFormat(lng.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

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

function typeLabel(raw: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    SEED: "case_detail.trust.type_seed",
    CREDIT: "case_detail.trust.type_credit",
    DEBIT: "case_detail.trust.type_debit",
    ADJUSTMENT: "case_detail.trust.type_adjustment",
    OTHER: "case_detail.trust.type_other",
  };
  const key = map[raw];
  return key ? t(key) : raw;
}

function visibilityLabel(raw: string | null, t: (k: string) => string): string {
  if (raw === "all") return t("case_detail.trust.visibility_all");
  return t("case_detail.trust.visibility_manager");
}

export function CaseTrustLedgerPanel({
  caseId,
  apiPathBase,
  currentBalance,
  onBalanceUpdated,
}: Props) {
  const { t } = useTranslation("portal");
  const { i18n } = useTranslation();
  const confirm = useConfirm();
  const lng = i18n.language;

  const [entries, setEntries] = useState<TrustLedgerEntry[]>([]);
  const [balance, setBalance] = useState(currentBalance);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [warnNegative, setWarnNegative] = useState(false);

  const [amount, setAmount] = useState("");
  const [changeType, setChangeType] = useState("SEED");
  const [receiver, setReceiver] = useState("");
  const [remark, setRemark] = useState("");
  const [voucherUrl, setVoucherUrl] = useState("");
  const [visibility, setVisibility] = useState<"all" | "manager">("manager");

  const trustApi = `${apiPathBase}/${encodeURIComponent(caseId)}/trust`;
  const onBalanceUpdatedRef = useRef(onBalanceUpdated);
  onBalanceUpdatedRef.current = onBalanceUpdated;

  const reload = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      const res = await fetch(trustApi);
      if (!res.ok) {
        setErrorKey("case_detail.trust.error_load");
        return;
      }
      const json = (await res.json()) as { balance: string; entries: TrustLedgerEntry[] };
      setEntries(json.entries ?? []);
      setBalance(json.balance);
      onBalanceUpdatedRef.current(json.balance);
    } catch {
      setErrorKey("case_detail.trust.error_load");
    } finally {
      setLoading(false);
    }
  }, [trustApi]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setBalance(currentBalance);
  }, [currentBalance]);

  const previewAfter = useMemo(() => {
    const n = Number(amount);
    const before = Number(balance);
    if (!Number.isFinite(n) || n === 0 || !Number.isFinite(before)) return null;
    let signed = n;
    if (changeType === "DEBIT" && signed > 0) signed = -signed;
    if ((changeType === "CREDIT" || changeType === "SEED") && signed < 0) signed = Math.abs(signed);
    return Math.round((before + signed) * 100) / 100;
  }, [amount, balance, changeType]);

  const onSubmit = async () => {
    if (saving) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) {
      setErrorKey("case_detail.trust.error_amount");
      return;
    }
    if (previewAfter != null && previewAfter < 0) {
      const ok = await confirm({
        message: t("case_detail.trust.confirm_negative"),
        danger: true,
      });
      if (!ok) return;
    }
    setSaving(true);
    setErrorKey(null);
    setWarnNegative(false);
    try {
      const res = await fetch(trustApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          change_amount: n,
          change_type: changeType,
          receiver,
          remark,
          voucher_url: voucherUrl,
          visibility,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { balance?: string; entries?: TrustLedgerEntry[]; wentNegative?: boolean; error?: string }
        | null;
      if (!res.ok) {
        setErrorKey("case_detail.trust.error_save");
        return;
      }
      if (json?.entries) setEntries(json.entries);
      if (json?.balance != null) {
        setBalance(json.balance);
        onBalanceUpdated(json.balance);
      }
      if (json?.wentNegative) setWarnNegative(true);
      setAmount("");
      setRemark("");
      setReceiver("");
      setVoucherUrl("");
    } catch {
      setErrorKey("case_detail.trust.error_save");
    } finally {
      setSaving(false);
    }
  };

  const balNum = Number(balance);
  const isNegative = Number.isFinite(balNum) && balNum < 0;

  return (
    <CollapsibleCard
      title={t("case_detail.trust.section_title")}
      summary={formatMoney(balance, lng)}
      storageKey={`crm-case-detail-trust-${caseId}`}
      defaultOpen={false}
    >
      <p className="mb-4 text-sm text-sage-700">{t("case_detail.trust.section_intro")}</p>

      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-sage-600">
          {t("case_detail.field_trust_balance")}
        </span>
        <span
          className={[
            "text-lg font-semibold tabular-nums",
            isNegative || warnNegative ? "text-red-700" : "text-sage-900",
          ].join(" ")}
        >
          {formatMoney(balance, lng)}
        </span>
        {isNegative || warnNegative ? (
          <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
            {t("case_detail.trust.negative_badge")}
          </span>
        ) : null}
      </div>

      {errorKey ? <p className="mb-3 text-sm text-red-700">{t(errorKey)}</p> : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-sage-600">
          {t("case_detail.trust.field_type")}
          <div className="mt-1">
            <SelectMenu
              value={changeType}
              onChange={setChangeType}
              disabled={saving}
              options={[
                { value: "SEED", label: t("case_detail.trust.type_seed") },
                { value: "CREDIT", label: t("case_detail.trust.type_credit") },
                { value: "DEBIT", label: t("case_detail.trust.type_debit") },
                { value: "ADJUSTMENT", label: t("case_detail.trust.type_adjustment") },
                { value: "OTHER", label: t("case_detail.trust.type_other") },
              ]}
            />
          </div>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-sage-600">
          {t("case_detail.trust.field_amount")}
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-sage-500">
              $
            </span>
            <input
              type="number"
              step="0.01"
              className="block w-full rounded-md border border-sage-300 bg-white py-2 pl-7 pr-3 text-sm text-sage-900"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={saving}
              placeholder="0.00"
            />
          </div>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-sage-600">
          {t("case_detail.trust.field_visibility")}
          <div className="mt-1">
            <SelectMenu
              value={visibility}
              onChange={(v) => setVisibility(v as "all" | "manager")}
              disabled={saving}
              options={[
                { value: "manager", label: t("case_detail.trust.visibility_manager") },
                { value: "all", label: t("case_detail.trust.visibility_all") },
              ]}
            />
          </div>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-sage-600 sm:col-span-2">
          {t("case_detail.trust.field_receiver")}
          <input
            type="text"
            className="mt-1 block w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm text-sage-900"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            disabled={saving}
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-sage-600 sm:col-span-2 lg:col-span-3">
          {t("case_detail.trust.field_remark")}
          <input
            type="text"
            className="mt-1 block w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm text-sage-900"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            disabled={saving}
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage-600">
            {t("case_detail.trust.field_voucher")}
          </p>
          <AmQiniuFileInput
            inputId={`trust-voucher-${caseId}`}
            caseId={caseId}
            value={voucherUrl}
            onChange={setVoucherUrl}
            disabled={saving}
          />
        </div>
      </div>

      {previewAfter != null && previewAfter < 0 ? (
        <p className="mb-3 text-sm font-medium text-amber-900">{t("case_detail.trust.preview_negative")}</p>
      ) : null}

      <button
        type="button"
        disabled={saving || loading}
        onClick={() => void onSubmit()}
        className="ami-ui mb-6 rounded-md border border-brand-brown bg-brand-brown px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? t("case_detail.trust.saving") : t("case_detail.trust.submit")}
      </button>

      {loading ? (
        <p className="text-sm text-sage-600">{t("case_detail.trust.loading")}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-sage-600">{t("case_detail.trust.empty")}</p>
      ) : (
        <>
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const header = [
                  "time",
                  "type",
                  "amount",
                  "balance_after",
                  "receiver",
                  "visibility",
                  "voucher_url",
                  "remark",
                ];
                const rows = entries.map((e) =>
                  [
                    e.created_at,
                    e.change_type,
                    e.change_amount,
                    e.balance_after ?? "",
                    e.receiver ?? "",
                    e.visibility ?? "",
                    e.voucher_url ?? "",
                    e.remark ?? "",
                  ]
                    .map((c) => `"${String(c).replace(/"/g, '""')}"`)
                    .join(","),
                );
                const csv = [header.join(","), ...rows].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `trust-ledger-case-${caseId}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-md border border-sage-300 bg-white px-3 py-1.5 text-xs font-semibold text-sage-800 hover:bg-sage-50"
            >
              {t("case_detail.trust.export_csv")}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-sage-200 text-xs uppercase tracking-wide text-sage-600">
                <tr>
                  <th className="py-2 pr-3 font-semibold">{t("case_detail.trust.col_time")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("case_detail.trust.col_type")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("case_detail.trust.col_amount")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("case_detail.trust.col_after")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("case_detail.trust.col_receiver")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("case_detail.trust.col_visibility")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("case_detail.trust.col_voucher")}</th>
                  <th className="py-2 font-semibold">{t("case_detail.trust.col_remark")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-sage-100 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap text-sage-700">
                      {formatDt(e.created_at, lng)}
                    </td>
                    <td className="py-2 pr-3 text-sage-800">{typeLabel(e.change_type, t)}</td>
                    <td className="py-2 pr-3 tabular-nums font-medium text-sage-900">
                      {formatMoney(e.change_amount, lng)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-sage-800">
                      {e.balance_after != null ? formatMoney(e.balance_after, lng) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-sage-700">{e.receiver || "—"}</td>
                    <td className="py-2 pr-3 text-sage-700">{visibilityLabel(e.visibility, t)}</td>
                    <td className="py-2 pr-3 text-sage-700">
                      {e.voucher_url ? (
                        <a
                          href={e.voucher_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-brand-brown underline"
                        >
                          {t("case_detail.trust.voucher_link")}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 text-sage-700">{e.remark || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CollapsibleCard>
  );
}
