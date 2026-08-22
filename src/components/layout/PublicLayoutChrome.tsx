"use client";

import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

export function PublicLayoutChrome({ children }: { children: ReactNode }) {
  return (
    <div className="crm-auth-shell relative">
      <div className="fixed end-4 top-4 z-50 md:end-6 md:top-5">
        <LanguageSwitcher variant="header" />
      </div>
      <div className="crm-auth-card">
        <p className="crm-font-display mb-5 text-center text-2xl font-semibold tracking-[0.14em] text-brand-brown">
          YUNDA
        </p>
        {children}
      </div>
    </div>
  );
}
