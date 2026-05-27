"use client";

import { Suspense } from "react";
import Link from "next/link";
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
  const { t } = useTranslation("portal");
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <CaseManagerAmDashboard
        variant="myCases"
        headerExtra={(
          <Link
            href="/case_manager/cases/new"
            className="inline-flex rounded-md border border-brand-brown/50 bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-brown hover:bg-white"
          >
            {t("cm_case.create_submit")}
          </Link>
        )}
      />
    </Suspense>
  );
}
