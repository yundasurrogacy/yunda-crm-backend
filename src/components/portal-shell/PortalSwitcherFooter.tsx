"use client";

import { useTranslation } from "react-i18next";

export function PortalSwitcherFooter() {
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

  return (
    <div className="flex flex-col gap-2 border-t border-sage-300 pt-4 text-xs text-sage-800">
      <button type="button" onClick={() => void switchPortal()} className="text-left underline">
        {t("switch_portal")}
      </button>
      <button type="button" onClick={() => void logout()} className="text-left underline">
        {t("logout")}
      </button>
    </div>
  );
}
