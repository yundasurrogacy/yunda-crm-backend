import { PortalChrome } from "@/components/portal-shell/PortalChrome";
import { fetchSessionIdentity } from "@/lib/auth/fetch-session-identity";
import { getServerSession } from "@/lib/auth/session-cookie";

export default async function IntendedParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const identity = session ? await fetchSessionIdentity(session, "intended_parent") : null;
  return (
    <PortalChrome role="intended_parent" identity={identity}>
      {children}
    </PortalChrome>
  );
}
