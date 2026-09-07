"use client";

import { useParams, useSearchParams } from "next/navigation";
import { EntityProfilePage } from "@/components/profile/EntityProfilePage";
import { safeReturnTo } from "@/lib/crm-list-return";

export default function AdminSurrogateProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const backHref = safeReturnTo(searchParams.get("returnTo"), ["/admin"], "/admin/accounts/surrogates");

  return (
    <EntityProfilePage
      kind="surrogate_mother"
      entityId={id}
      apiBasePath="/api/admin/accounts"
      backHref={backHref}
      i18nPrefix="admin_entity"
    />
  );
}
