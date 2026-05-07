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

/** 文档「My case」：当前案例经理负责的**全部**案例（各阶段混在一起），不提供阶段下拉 */
export default function CaseManagerMyCasesRoutePage() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <CaseManagerAmDashboard variant="myCases" />
    </Suspense>
  );
}
