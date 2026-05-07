import { PortalChrome } from "@/components/portal-shell/PortalChrome";

export default async function CaseManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalChrome role="case_manager">
      {children}
    </PortalChrome>
  );
}
