"use client";

import { useParams } from "next/navigation";
import { PartyCaseDetailPage } from "@/components/party/PartyCaseDetailPage";

export default function SurrogateMotherCaseDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  return (
    <PartyCaseDetailPage
      caseId={id}
      apiBase="/api/surrogate-mother/cases"
      listHref="/surrogate_mother/my-cases"
    />
  );
}
