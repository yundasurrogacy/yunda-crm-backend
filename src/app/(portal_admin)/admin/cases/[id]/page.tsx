"use client";

import { useParams, useSearchParams } from "next/navigation";
import { CaseManagerCaseDetail } from "@/components/case-manager/CaseManagerCaseDetail";
import { safeReturnTo } from "@/lib/crm-list-return";

export default function AdminCaseDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  return (
    <CaseManagerCaseDetail
      caseId={id}
      apiPathBase="/api/admin/cases"
      backHref={safeReturnTo(searchParams.get("returnTo"), ["/admin"], "/admin/cases")}
      casesPageBase="/admin/cases"
      partyProfileMode="admin"
    />
  );
}
