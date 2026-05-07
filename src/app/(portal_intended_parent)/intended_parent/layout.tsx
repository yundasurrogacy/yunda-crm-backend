import { PortalChrome } from "@/components/portal-shell/PortalChrome";

export default async function IntendedParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalChrome role="intended_parent">
      {children}
    </PortalChrome>
  );
}
