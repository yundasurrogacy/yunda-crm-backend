"use client";

import { useParams, useSearchParams } from "next/navigation";
import { EntityProfilePage } from "@/components/profile/EntityProfilePage";
import { safeReturnTo } from "@/lib/crm-list-return";

export default function CaseManagerIntendedParentProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const backHref = safeReturnTo(
    searchParams.get("returnTo"),
    ["/case_manager", "/admin"],
    "/case_manager/parties/intended-parents",
  );

  return (
    <EntityProfilePage
      kind="intended_parent"
      entityId={id}
      apiBasePath="/api/case-manager/parties"
      backHref={backHref}
      i18nPrefix="cm_entity"
    />
  );
}
