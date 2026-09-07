"use client";

import { PortalHelpPage } from "@/components/help/PortalHelpPage";
import { SM_HELP } from "@/lib/help/portal-help";

export default function SurrogateHelpRoute() {
  return <PortalHelpPage doc={SM_HELP} />;
}
