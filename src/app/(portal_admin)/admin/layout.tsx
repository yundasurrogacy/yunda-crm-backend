import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/portal-shell/AdminChrome";
import { fetchSessionIdentity } from "@/lib/auth/fetch-session-identity";
import { getServerSession } from "@/lib/auth/session-cookie";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  // 会话失效（已登出 / 账号被停用）时立即回登录页，避免停用后仍能浏览页面外壳
  if (!session) redirect("/login");
  // 角色以数据库为准：被降级的管理员不应再看到后台（middleware 读的是 cookie，兜不住）
  if (session.role !== "admin") redirect("/select-portal");
  const identity = await fetchSessionIdentity(session, "admin");
  return <AdminChrome identity={identity}>{children}</AdminChrome>;
}
