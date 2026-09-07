import { PortalChrome } from "@/components/portal-shell/PortalChrome";
import { fetchSessionIdentity } from "@/lib/auth/fetch-session-identity";
import { getServerSession } from "@/lib/auth/session-cookie";

export default async function CaseManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const identity = session ? await fetchSessionIdentity(session, "case_manager") : null;
  return (
    <PortalChrome role="case_manager" identity={identity}>
      {children}
    </PortalChrome>
  );
}
