"use client";

import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

export function PublicLayoutChrome({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-main-bg p-6">
      <div className="fixed end-4 top-4 z-50 md:end-6 md:top-5">
        <LanguageSwitcher variant="header" />
      </div>
      <div className="card-surface w-full max-w-md rounded-lg border border-sage-300 p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
