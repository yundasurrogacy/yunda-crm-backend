"use client";

import { PortalHelpPage } from "@/components/help/PortalHelpPage";
import { IP_HELP } from "@/lib/help/portal-help";

export default function IntendedParentHelpRoute() {
  return <PortalHelpPage doc={IP_HELP} />;
}
