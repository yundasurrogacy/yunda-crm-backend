import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session-cookie";

export default async function HomePage() {
  const s = await getServerSession();
  if (!s) redirect("/login");
  if (!s.activePortal) redirect("/select-portal");
  redirect(`/${s.activePortal}`);
}
