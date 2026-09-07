"use client";

import { useTranslation } from "react-i18next";
import type { SessionIdentity } from "@/lib/auth/fetch-session-identity";
import type { PortalId } from "@/types/portal";

type Shell = "admin" | PortalId;

export function PortalSwitcherFooter({
  shell,
  identity,
}: {
  shell: Shell;
  identity: SessionIdentity | null;
}) {
  const { t } = useTranslation("portal");

  async function switchPortal() {
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clearActivePortal" }),
    });
    window.location.href = "/select-portal";
  }

  async function logout() {
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    window.location.href = "/login";
  }

  const entityLabelKey =
    identity?.entity?.kind === "case_manager"
      ? "account_bar.entity_cm"
      : identity?.entity?.kind === "intended_parent"
        ? "account_bar.entity_ip"
        : identity?.entity?.kind === "surrogate_mother"
          ? "account_bar.entity_sm"
          : null;

  return (
    <div className="flex flex-col gap-2 text-xs text-sage-800">
      {identity ? (
        <div className="space-y-2 rounded-lg border border-white/70 bg-white/80 px-2.5 py-2.5 text-[11px] leading-snug text-sage-800 shadow-sm">
          <p className="font-semibold uppercase tracking-wide text-sage-600">
            {t("account_bar.title")}
          </p>
          <p>
            <span className="text-sage-600">{t("account_bar.login")}</span>
            <span className="mt-0.5 block break-all font-medium text-sage-900">
              {identity.userEmail || "—"}
            </span>
            <span className="text-sage-500">
              {t("account_bar.user_meta", {
                id: identity.userId,
                role: identity.userRole,
              })}
            </span>
          </p>
          {shell !== "admin" ? (
            identity.entity && entityLabelKey ? (
              <p className="border-t border-sage-200/80 pt-2">
                <span className="text-sage-600">{t(entityLabelKey)}</span>
                <span className="mt-0.5 block break-all font-medium text-sage-900">
                  {identity.entity.email || t("account_bar.no_entity_email")}
                </span>
                <span className="text-sage-500">
                  {t("account_bar.entity_id", { id: identity.entity.id })}
                </span>
              </p>
            ) : (
              <p className="border-t border-amber-200/80 pt-2 text-amber-950/90">
                {t("account_bar.entity_unbound")}
              </p>
            )
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => void switchPortal()}
          className="crm-btn crm-btn-secondary w-full justify-center px-2 py-1.5 text-xs"
        >
          {t("switch_portal")}
        </button>
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full rounded-md px-2 py-1.5 text-center text-xs font-semibold text-sage-800 hover:bg-white/40"
        >
          {t("logout")}
        </button>
      </div>
    </div>
  );
}
