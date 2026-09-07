"use client";

import { useParams, useSearchParams } from "next/navigation";
import { EntityProfilePage } from "@/components/profile/EntityProfilePage";
import { safeReturnTo } from "@/lib/crm-list-return";

export default function CaseManagerSurrogateProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const backHref = safeReturnTo(
    searchParams.get("returnTo"),
    ["/case_manager", "/admin"],
    "/case_manager/parties/surrogates",
  );

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
