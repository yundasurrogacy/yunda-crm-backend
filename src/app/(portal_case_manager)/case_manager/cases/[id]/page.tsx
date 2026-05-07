"use client";

import { useParams } from "next/navigation";
import { CaseManagerCaseDetail } from "@/components/case-manager/CaseManagerCaseDetail";

export default function CaseManagerCaseDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  return <CaseManagerCaseDetail caseId={id} />;
}
