"use client";

import { useTranslation } from "react-i18next";
import { AdminCaseManagerWorkload } from "@/components/admin/AdminCaseManagerWorkload";
import { CaseManagerAmDashboard } from "@/components/case-manager/CaseManagerAmDashboard";

export default function AdminHomePage() {
  const { t } = useTranslation("portal");
  return (
    <div className="crm-page">
      <div>
        <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">
          {t("pages.admin_dashboard_heading")}
        </h1>
        <p className="mt-1 text-sm text-sage-700">{t("admin_dash.welcome_sub")}</p>
      </div>
      <CaseManagerAmDashboard
        variant="full"
        apiPath="/api/admin/cases"
        detailHrefBase="/admin/cases"
        headingMode="admin"
        hidePageHeading
      />
      <AdminCaseManagerWorkload />
    </div>
  );
}
