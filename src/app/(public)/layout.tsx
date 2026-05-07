import { PublicLayoutChrome } from "@/components/layout/PublicLayoutChrome";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayoutChrome>{children}</PublicLayoutChrome>;
}
