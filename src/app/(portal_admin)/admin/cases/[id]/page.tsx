"use client";

import { useParams } from "next/navigation";
import { CaseManagerCaseDetail } from "@/components/case-manager/CaseManagerCaseDetail";

export default function AdminCaseDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  return (
    <CaseManagerCaseDetail
      caseId={id}
      apiPathBase="/api/admin/cases"
      backHref="/admin/cases"
    />
  );
}
