"use client";

import { useParams, useSearchParams } from "next/navigation";
import { PartyCaseDetailPage } from "@/components/party/PartyCaseDetailPage";
import { safeReturnTo } from "@/lib/crm-list-return";

export default function SurrogateMotherCaseDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  return (
    <PartyCaseDetailPage
      caseId={id}
      apiBase="/api/surrogate-mother/cases"
      listHref={safeReturnTo(
        searchParams.get("returnTo"),
        ["/surrogate_mother"],
        "/surrogate_mother/my-cases",
      )}
      canPostMessages
    />
  );
}
