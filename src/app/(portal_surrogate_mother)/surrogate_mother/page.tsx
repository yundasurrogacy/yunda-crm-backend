"use client";

import { useTranslation } from "react-i18next";

export default function SurrogateMotherHomePage() {
  const { t } = useTranslation("portal");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-brand-brown">{t("pages.sm_home_heading")}</h1>
      <p className="text-sage-800">{t("placeholder.surrogate_home")}</p>
    </div>
  );
}
