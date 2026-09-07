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

/** 案例列表：可在页内切换「我创建的」与「我负责的」 */
export default function CaseManagerMyCasesRoutePage() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <CaseManagerAmDashboard variant="myCases" createCaseMode="case_manager" />
    </Suspense>
  );
}
