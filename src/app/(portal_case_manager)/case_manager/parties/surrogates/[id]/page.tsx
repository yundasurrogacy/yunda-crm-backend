"use client";

import { useParams, useSearchParams } from "next/navigation";
import { EntityProfilePage } from "@/components/profile/EntityProfilePage";

export default function CaseManagerSurrogateProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const returnTo = searchParams.get("returnTo");
  const backHref =
    returnTo && (returnTo.startsWith("/case_manager") || returnTo.startsWith("/admin"))
      ? returnTo
      : "/case_manager/parties/surrogates";

  return (
    <EntityProfilePage
      kind="surrogate_mother"
      entityId={id}
      apiBasePath="/api/case-manager/parties"
      backHref={backHref}
      i18nPrefix="cm_entity"
    />
  );
}
