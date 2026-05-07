"use client";

import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { CaseManagerAmDashboard } from "@/components/case-manager/CaseManagerAmDashboard";

function SuspenseFallback() {
  const { t } = useTranslation("common");
  return (
    <p className="ami-ui text-sm text-slate-600">
      {t("loading")}
    </p>
  );
}

export default function CaseManagerDashboardRoutePage() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <CaseManagerAmDashboard variant="full" />
    </Suspense>
  );
}
