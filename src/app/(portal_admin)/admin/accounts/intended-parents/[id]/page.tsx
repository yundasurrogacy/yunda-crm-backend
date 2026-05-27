"use client";

import { useParams, useSearchParams } from "next/navigation";
import { EntityProfilePage } from "@/components/profile/EntityProfilePage";

export default function AdminIntendedParentProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const returnTo = searchParams.get("returnTo");
  const backHref = returnTo?.startsWith("/admin") ? returnTo : "/admin/accounts/intended-parents";

  return (
    <EntityProfilePage
      kind="intended_parent"
      entityId={id}
      apiBasePath="/api/admin/accounts"
      backHref={backHref}
      i18nPrefix="admin_entity"
    />
  );
}
