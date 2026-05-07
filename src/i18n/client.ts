import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import commonZh from "../../public/locales/zh-CN/common.json";
import commonEn from "../../public/locales/en/common.json";
import authZh from "../../public/locales/zh-CN/auth.json";
import authEn from "../../public/locales/en/auth.json";
import portalZh from "../../public/locales/zh-CN/portal.json";
import portalEn from "../../public/locales/en/portal.json";
import caseStageZh from "../../public/locales/zh-CN/caseStage.json";
import caseStageEn from "../../public/locales/en/caseStage.json";
import type { CrmLang } from "./constants";

export type { CrmLang } from "./constants";
export { CRM_I18N_LANG_KEY } from "./constants";

/** 每棵 Provider 树一实例，避免 Next SSR 并发共用默认单例导致串语言 */
export function createCrmI18n(lng: CrmLang): typeof i18next {
  const inst = i18next.createInstance();
  void inst.use(initReactI18next).init({
    lng,
    fallbackLng: "zh-CN",
    supportedLngs: ["zh-CN", "en"],
    ns: ["common", "auth", "portal", "caseStage"],
    defaultNS: "common",
    react: {
      useSuspense: false,
    },
    resources: {
      "zh-CN": {
        common: commonZh,
        auth: authZh,
        portal: portalZh,
        caseStage: caseStageZh,
      },
      en: {
        common: commonEn,
        auth: authEn,
        portal: portalEn,
        caseStage: caseStageEn,
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });
  return inst;
}

/** Sync document language + theme class after i18next language loads or changes */
export function applyLanguageToDom(lng: string): void {
  if (typeof document === "undefined") return;
  const html = lng.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
  document.documentElement.lang = html;
  document.documentElement.classList.toggle("lang-zh", html === "zh-CN");
}
