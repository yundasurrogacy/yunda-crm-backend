"use client";

import { useParams } from "next/navigation";
import { PartyCaseDetailPage } from "@/components/party/PartyCaseDetailPage";

export default function IntendedParentCaseDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  return (
    <PartyCaseDetailPage
      caseId={id}
      apiBase="/api/intended-parent/cases"
      listHref="/intended_parent/my-cases"
    />
  );
}
