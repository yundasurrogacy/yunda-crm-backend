"use client";

import { useTranslation } from "react-i18next";
import { applyLanguageToDom, CRM_I18N_LANG_KEY, type CrmLang } from "@/i18n/client";

const LOCALES = ["zh-CN", "en"] as const;

function persistLang(code: CrmLang) {
  try {
    localStorage.setItem(CRM_I18N_LANG_KEY, code);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${CRM_I18N_LANG_KEY}=${encodeURIComponent(code)}; Path=/; Max-Age=${
      60 * 60 * 24 * 365
    }; SameSite=Lax`;
  } catch {
    /* ignore */
  }
  applyLanguageToDom(code);
}

export function LanguageSwitcher({
  variant = "default",
}: {
  /**
   * default / compact — 表单区用
   * pill — 带边框分组（与设计稿备选一致）
   * header — 对齐 yunda-admin-system CommonHeader：`EN / CN`，text-lg、sage 字色
   */
  variant?: "default" | "compact" | "pill" | "header";
}) {
  const { t, i18n } = useTranslation("common");

  function setLng(code: CrmLang) {
    void i18n.changeLanguage(code);
    persistLang(code);
  }

  const current = i18n.language;

  if (variant === "header") {
    const btnBase =
      "ami-ui px-2 py-0.5 focus:outline-none focus:ring-0 border-none bg-transparent m-0 transition-all duration-100 cursor-pointer rounded active:scale-95 hover:bg-sage-100 text-lg leading-none text-sage-800";
    const isEn = current === "en" || current.toLowerCase().startsWith("en");
    const isZh = current === "zh-CN" || current.toLowerCase().startsWith("zh");
    return (
      <div className="ami-ui flex items-center gap-1 text-lg text-sage-800" aria-label={t("language.label")}>
        <button
          type="button"
          className={`${btnBase} ${isEn ? "font-semibold" : "font-medium"}`}
          style={{ textDecoration: "none" }}
          tabIndex={0}
          onClick={() => void (!isEn && setLng("en"))}
        >
          EN
        </button>
        <span className="mx-0.5 text-sage-700 select-none" aria-hidden>
          /
        </span>
        <button
          type="button"
          className={`${btnBase} ${isZh ? "font-semibold" : "font-medium"}`}
          style={{ textDecoration: "none" }}
          tabIndex={0}
          onClick={() => void (!isZh && setLng("zh-CN"))}
        >
          CN
        </button>
      </div>
    );
  }

  const wrapper =
    variant === "pill"
      ? "ami-ui flex flex-wrap gap-1 rounded-md border border-sage-300 bg-white/50 p-0.5"
      : variant === "compact"
        ? "ami-ui flex gap-1"
        : "ami-ui flex gap-2 text-xs";

  return (
    <div className={wrapper} aria-label={t("language.label")}>
      {LOCALES.map((code) => {
        const active =
          code === "en"
            ? current === "en" || current.toLowerCase().startsWith("en")
            : current === "zh-CN" || current.toLowerCase().startsWith("zh");
        const btnClass =
          variant === "pill"
            ? active
              ? "ami-ui rounded bg-brand-brown px-2 py-1 text-xs text-white"
              : "ami-ui rounded px-2 py-1 text-xs text-sage-800 hover:bg-sage-100"
            : variant === "compact"
              ? active
                ? "ami-ui text-xs font-semibold text-brand-brown underline"
                : "ami-ui text-xs text-sage-700 hover:text-brand-brown"
              : active
                ? "ami-ui text-xs font-semibold text-brand-brown"
                : "ami-ui text-xs text-sage-700 underline decoration-sage-300 hover:text-brand-brown";
        return (
          <button key={code} type="button" className={btnClass} onClick={() => void setLng(code)}>
            {code === "zh-CN" ? t("language.zhCN") : t("language.en")}
          </button>
        );
      })}
    </div>
  );
}
