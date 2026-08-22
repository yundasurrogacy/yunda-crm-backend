"use client";

import { PartyHomePage } from "@/components/party/PartyHomePage";

export default function SurrogateMotherHomePage() {
  return (
    <PartyHomePage
      party="surrogate_mother"
      apiBase="/api/surrogate-mother/cases"
      casesHref="/surrogate_mother/my-cases"
      detailBase="/surrogate_mother/cases"
      profileHref="/surrogate_mother/profile"
    />
  );
}
