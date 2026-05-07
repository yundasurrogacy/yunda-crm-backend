import { AdminChrome } from "@/components/portal-shell/AdminChrome";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminChrome>{children}</AdminChrome>;
}
