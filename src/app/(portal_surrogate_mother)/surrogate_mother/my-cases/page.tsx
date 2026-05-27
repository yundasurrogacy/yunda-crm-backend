"use client";

import { PartyMyCasesPage } from "@/components/party/PartyMyCasesPage";

export default function SurrogateMotherMyCasesPage() {
  return (
    <PartyMyCasesPage
      party="surrogate_mother"
      apiBase="/api/surrogate-mother/cases"
      detailBase="/surrogate_mother/cases"
    />
  );
}
