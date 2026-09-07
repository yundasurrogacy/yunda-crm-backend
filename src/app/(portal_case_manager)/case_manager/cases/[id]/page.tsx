"use client";

import { useParams, useSearchParams } from "next/navigation";
import { CaseManagerCaseDetail } from "@/components/case-manager/CaseManagerCaseDetail";
import { safeReturnTo } from "@/lib/crm-list-return";

export default function CaseManagerCaseDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  return (
    <CaseManagerCaseDetail
      caseId={id}
      backHref={safeReturnTo(searchParams.get("returnTo"), ["/case_manager"], "/case_manager/cases")}
    />
  );
}
