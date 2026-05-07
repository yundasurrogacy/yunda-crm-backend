"use client";

import Link from "next/link";
import { CaseManagerAmDashboard } from "@/components/case-manager/CaseManagerAmDashboard";
import { useTranslation } from "react-i18next";

export default function AdminCasesPage() {
  const { t } = useTranslation("portal");

  return (
    <CaseManagerAmDashboard
      variant="stageList"
      apiPath="/api/admin/cases"
      detailHrefBase="/admin/cases"
      headingMode="admin"
      headerExtra={
        <Link
          href="/admin/cases/new"
          className="inline-flex shrink-0 items-center rounded-md bg-brand-brown px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          {t("nav.admin.create_case")}
        </Link>
      }
    />
  );
}
