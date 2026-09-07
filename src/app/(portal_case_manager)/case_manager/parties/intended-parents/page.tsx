"use client";

import { Suspense } from "react";
import { CaseManagerPartyListPage } from "@/components/case-manager/CaseManagerPartyListPage";

export default function CaseManagerIntendedParentsListPage() {
  return (
    <Suspense fallback={<p className="text-sm text-sage-600">Loading…</p>}>
      <CaseManagerPartyListPage kind="intended_parent" />
    </Suspense>
  );
}
