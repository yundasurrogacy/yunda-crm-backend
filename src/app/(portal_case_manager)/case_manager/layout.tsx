import { redirect } from "next/navigation";
import { PortalChrome } from "@/components/portal-shell/PortalChrome";
import { fetchSessionIdentity } from "@/lib/auth/fetch-session-identity";
import { getServerSession } from "@/lib/auth/session-cookie";

export default async function CaseManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  // 会话失效（已登出 / 账号被停用）时立即回登录页
  if (!session) redirect("/login");
  const identity = await fetchSessionIdentity(session, "case_manager");
  return (
    <PortalChrome role="case_manager" identity={identity}>
      {children}
    </PortalChrome>
  );
}
