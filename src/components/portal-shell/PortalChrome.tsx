"use client";

import { useTranslation } from "react-i18next";
import {
  caseManagerNav,
  intendedParentNav,
  surrogateMotherNav,
  type PortalNavItem,
} from "@/config/portal-nav";
import { AppShell } from "./AppShell";

type PortalRole = "case_manager" | "intended_parent" | "surrogate_mother";

const navByRole: Record<PortalRole, readonly PortalNavItem[]> = {
  case_manager: caseManagerNav,
  intended_parent: intendedParentNav,
  surrogate_mother: surrogateMotherNav,
};

const headingKeyByRole: Record<PortalRole, string> = {
  case_manager: "heading.case_manager",
  intended_parent: "heading.intended_parent",
  surrogate_mother: "heading.surrogate_mother",
};

export function PortalChrome({
  role,
  children,
}: {
  role: PortalRole;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("portal");
  const nav = navByRole[role];
  const headingKey = headingKeyByRole[role];

  const centerSlot =
    role === "case_manager" ? (
      <span className="crm-font-display text-base font-semibold tracking-wide text-brand-brown md:text-lg">
        {t("am_dash.brand")}
      </span>
    ) : null;

  return (
    <AppShell sidebarTitleKey={headingKey} navItems={nav} centerSlot={centerSlot}>
      {children}
    </AppShell>
  );
}
