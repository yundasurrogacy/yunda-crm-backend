"use client";

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

  async function choose(portal: PortalId) {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setActivePortal", portal }),
    });
    if (!res.ok) return;
    window.location.href = `/${portal}`;
  }

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-brand-brown">{t("select_title")}</h1>
      <p className="mb-6 text-sm leading-relaxed text-sage-800">{t("select_subtitle")}</p>
      {portals.length === 0 ? (
        <p className="text-sm text-sage-800">{t("select_no_portals")}</p>
      ) : (
        <ul className="space-y-2">
          {portals.map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => void choose(p)}
                className="w-full rounded-md border border-sage-300 bg-white/70 px-4 py-3 text-left text-sm hover:bg-sage-100"
              >
                {t(`portal_labels.${p}`)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {isAdmin ? (
        <button
          type="button"
          className="mt-6 w-full rounded-md border border-brand-brown px-4 py-3 text-sm font-medium text-brand-brown hover:bg-sage-100"
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
