"use client";

import { PartyMyCasesPage } from "@/components/party/PartyMyCasesPage";

export default function IntendedParentMyCasesPage() {
  return (
    <PartyMyCasesPage
      party="intended_parent"
      apiBase="/api/intended-parent/cases"
      detailBase="/intended_parent/cases"
    />
  );
}
