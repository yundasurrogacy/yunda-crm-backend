"use client";

import { useTranslation } from "react-i18next";
import type { PartyTrustSnapshot } from "@/lib/party/fetch-party-case-page";

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

/** 准父母端：只读信托余额与「客户可见」流水（随案例详情一次返回） */
export function PartyTrustLedgerPanel({
  initial,
}: {
  initial: PartyTrustSnapshot | null;
}) {
  const { t, i18n } = useTranslation("portal");
  const lng = i18n.language;
  const balance = initial?.balance ?? "0";
  const entries = initial?.entries ?? [];
  const error = initial == null;

  const balNum = Number(balance);
  const isNegative = Number.isFinite(balNum) && balNum < 0;

  return (
    <section className="crm-card">
      <h2 className="crm-font-display mb-2 text-lg font-semibold text-brand-brown">
        {t("party_cases.trust_section_title")}
      </h2>
      <p className="mb-4 text-sm text-sage-700">{t("party_cases.trust_section_intro")}</p>

      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-sage-600">
          {t("case_detail.field_trust_balance")}
        </span>
        <span
          className={[
            "text-lg font-semibold tabular-nums",
            isNegative ? "text-red-700" : "text-sage-900",
          ].join(" ")}
        >
          {formatMoney(balance, lng)}
        </span>
      </div>

      {error ? <p className="text-sm text-red-700">{t("party_cases.trust_error_load")}</p> : null}

      {!error ? (
        entries.length === 0 ? (
          <p className="text-sm text-sage-600">{t("party_cases.trust_empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-sage-200 text-xs uppercase tracking-wide text-sage-600">
                <tr>
                  <th className="py-2 pr-3 font-semibold">{t("case_detail.trust.col_time")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("case_detail.trust.col_type")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("case_detail.trust.col_amount")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("case_detail.trust.col_after")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("case_detail.trust.col_receiver")}</th>
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
        )
      ) : null}
    </section>
  );
}
