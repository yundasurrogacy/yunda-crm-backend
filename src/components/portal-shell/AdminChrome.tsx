"use client";

import { adminNav } from "@/config/portal-nav";
import type { SessionIdentity } from "@/lib/auth/fetch-session-identity";
import { AppShell } from "./AppShell";

export function AdminChrome({
  identity,
  children,
}: {
  identity: SessionIdentity | null;
  children: React.ReactNode;
}) {
  return (
    <AppShell
      sidebarTitleKey="heading.admin_shell"
      navItems={adminNav}
      shell="admin"
      identity={identity}
    >
      {children}
    </AppShell>
  );
}
