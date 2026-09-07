"use client";

import { Suspense } from "react";
import { PartyMyCasesPage } from "@/components/party/PartyMyCasesPage";

export default function IntendedParentMyCasesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-sage-600">Loading…</p>}>
      <PartyMyCasesPage
        party="intended_parent"
        apiBase="/api/intended-parent/cases"
        detailBase="/intended_parent/cases"
      />
    </Suspense>
  );
}
