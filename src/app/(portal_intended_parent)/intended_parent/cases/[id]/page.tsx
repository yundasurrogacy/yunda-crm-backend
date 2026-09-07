"use client";

import { useParams, useSearchParams } from "next/navigation";
import { PartyCaseDetailPage } from "@/components/party/PartyCaseDetailPage";
import { safeReturnTo } from "@/lib/crm-list-return";

export default function IntendedParentCaseDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  return (
    <PartyCaseDetailPage
      caseId={id}
      apiBase="/api/intended-parent/cases"
      listHref={safeReturnTo(searchParams.get("returnTo"), ["/intended_parent"], "/intended_parent/my-cases")}
      canPostMessages
    />
  );
}
