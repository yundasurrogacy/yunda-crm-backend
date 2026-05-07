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

/** 承接 Dashboard 「按阶段跳到案例列表」（URL `/case_manager/cases?stage=`），侧边栏不提供重复入口 */
export default function CaseManagerCasesRoutePage() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <CaseManagerAmDashboard variant="stageList" />
    </Suspense>
  );
}
