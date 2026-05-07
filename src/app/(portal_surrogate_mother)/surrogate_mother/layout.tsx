import { PortalChrome } from "@/components/portal-shell/PortalChrome";

export default async function SurrogateMotherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalChrome role="surrogate_mother">
      {children}
    </PortalChrome>
  );
}
