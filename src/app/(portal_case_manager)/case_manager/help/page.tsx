"use client";

import { PortalHelpPage } from "@/components/help/PortalHelpPage";
import { CM_HELP } from "@/lib/help/portal-help";

export default function CaseManagerHelpRoute() {
  return <PortalHelpPage doc={CM_HELP} />;
}
