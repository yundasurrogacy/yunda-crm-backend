"use client";

import { PartyHomePage } from "@/components/party/PartyHomePage";

export default function IntendedParentHomePage() {
  return (
    <PartyHomePage
      party="intended_parent"
      apiBase="/api/intended-parent/cases"
      casesHref="/intended_parent/my-cases"
      detailBase="/intended_parent/cases"
    />
  );
}
