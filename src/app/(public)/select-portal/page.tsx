import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session-cookie";
import { SelectPortalClient } from "./SelectPortalClient";

export default async function SelectPortalPage() {
  const s = await getServerSession();
  if (!s) redirect("/login");

  return <SelectPortalClient portals={s.portals} isAdmin={s.role === "admin"} />;
}
