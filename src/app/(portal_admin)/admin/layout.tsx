import { AdminChrome } from "@/components/portal-shell/AdminChrome";
import { fetchSessionIdentity } from "@/lib/auth/fetch-session-identity";
import { getServerSession } from "@/lib/auth/session-cookie";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const identity = session ? await fetchSessionIdentity(session, "admin") : null;
  return <AdminChrome identity={identity}>{children}</AdminChrome>;
}
