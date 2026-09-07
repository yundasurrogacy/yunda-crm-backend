"use client";

import {
  caseManagerNav,
  intendedParentNav,
  surrogateMotherNav,
  type PortalNavItem,
} from "@/config/portal-nav";
import type { SessionIdentity } from "@/lib/auth/fetch-session-identity";
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
  identity,
  children,
}: {
  role: PortalRole;
  identity: SessionIdentity | null;
  children: React.ReactNode;
}) {
  const nav = navByRole[role];
  const headingKey = headingKeyByRole[role];

  return (
    <AppShell sidebarTitleKey={headingKey} navItems={nav} shell={role} identity={identity}>
      {children}
    </AppShell>
  );
}
