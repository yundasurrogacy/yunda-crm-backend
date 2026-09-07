"use client";

import { Suspense } from "react";
import { PartyMyCasesPage } from "@/components/party/PartyMyCasesPage";

export default function SurrogateMotherMyCasesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-sage-600">Loading…</p>}>
      <PartyMyCasesPage
        party="surrogate_mother"
        apiBase="/api/surrogate-mother/cases"
        detailBase="/surrogate_mother/cases"
      />
    </Suspense>
  );
}
