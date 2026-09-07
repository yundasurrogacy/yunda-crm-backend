import { PortalChrome } from "@/components/portal-shell/PortalChrome";
import { fetchSessionIdentity } from "@/lib/auth/fetch-session-identity";
import { getServerSession } from "@/lib/auth/session-cookie";

export default async function SurrogateMotherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const identity = session ? await fetchSessionIdentity(session, "surrogate_mother") : null;
  return (
    <PortalChrome role="surrogate_mother" identity={identity}>
      {children}
    </PortalChrome>
  );
}
