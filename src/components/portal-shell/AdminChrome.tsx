"use client";

import { adminNav } from "@/config/portal-nav";
import { AppShell } from "./AppShell";

export function AdminChrome({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebarTitleKey="heading.admin_shell" navItems={adminNav}>
      {children}
    </AppShell>
  );
}
