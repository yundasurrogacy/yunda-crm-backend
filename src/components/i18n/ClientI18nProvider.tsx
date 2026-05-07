"use client";

import { I18nextProvider } from "react-i18next";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { createCrmI18n, applyLanguageToDom, CRM_I18N_LANG_KEY, type CrmLang } from "@/i18n/client";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ClientI18nProvider({
  children,
  initialLng,
}: {
  children: React.ReactNode;
  initialLng: CrmLang;
}) {
  const i18n = useMemo(() => createCrmI18n(initialLng), [initialLng]);

  useIsomorphicLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(CRM_I18N_LANG_KEY);
      if (stored === "zh-CN" || stored === "en") {
        if (stored !== i18n.language) void i18n.changeLanguage(stored);
        document.cookie = `${CRM_I18N_LANG_KEY}=${encodeURIComponent(stored)}; Path=/; Max-Age=${
          60 * 60 * 24 * 365
        }; SameSite=Lax`;
      }
    } catch {
      /* ignore */
    }
    applyLanguageToDom(i18n.language);
  }, [i18n]);

  useEffect(() => {
    const onLng = (lng: string) => {
      applyLanguageToDom(lng);
    };
    i18n.on("languageChanged", onLng);
    return () => {
      i18n.off("languageChanged", onLng);
    };
  }, [i18n]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
