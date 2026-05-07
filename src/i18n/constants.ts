/** Browser cookie + localStorage key（对齐 i18next 约定） */
export const CRM_I18N_LANG_KEY = "i18nextLng" as const;

export type CrmLang = "zh-CN" | "en";

export function parseCrmLang(raw?: string | null): CrmLang {
  return raw === "en" ? "en" : "zh-CN";
}
