"use client";

import { PortalHelpPage } from "@/components/help/PortalHelpPage";
import { ADMIN_HELP } from "@/lib/help/portal-help";

export default function AdminHelpRoute() {
  return <PortalHelpPage doc={ADMIN_HELP} />;
}
