"use client";

import { useState } from "react";
import type { PortalId } from "@/types/portal";
import { useTranslation } from "react-i18next";

export function SelectPortalClient({
  portals,
  isAdmin,
}: {
  portals: PortalId[];
  isAdmin: boolean;
}) {
  const { t } = useTranslation("portal");
  const [busy, setBusy] = useState<string | null>(null);

  async function choose(portal: PortalId) {
    if (busy) return;
    setBusy(portal);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setActivePortal", portal }),
      });
      if (!res.ok) {
        setBusy(null);
        return;
      }
      window.location.href = `/${portal}`;
    } catch {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="crm-font-display mb-2 text-2xl font-semibold text-brand-brown">{t("select_title")}</h1>
      <p className="mb-6 text-sm leading-relaxed text-sage-700">{t("select_subtitle")}</p>
      {portals.length === 0 ? (
        <p className="rounded-md border border-sage-200 bg-white/60 px-3 py-3 text-sm text-sage-800">
          {t("select_no_portals")}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {portals.map((p) => (
            <li key={p}>
              <button
                type="button"
                disabled={busy != null}
                onClick={() => void choose(p)}
                className="group flex w-full items-center justify-between rounded-lg border border-sage-300/80 bg-white/80 px-4 py-3.5 text-left text-sm font-medium text-sage-900 shadow-sm transition hover:border-brand-brown/40 hover:bg-white hover:shadow disabled:opacity-60"
              >
                <span>{t(`portal_labels.${p}`)}</span>
                <span className="text-xs font-semibold text-brand-brown opacity-0 transition group-hover:opacity-100">
                  {busy === p ? "…" : "→"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {isAdmin ? (
        <button
          type="button"
          disabled={busy != null}
          className="crm-btn crm-btn-secondary mt-6 w-full border-brand-brown/50 py-3 text-brand-brown"
          onClick={() => {
            window.location.href = "/admin";
          }}
        >
          {t("enter_admin_console")}
        </button>
      ) : null}
    </div>
  );
}
