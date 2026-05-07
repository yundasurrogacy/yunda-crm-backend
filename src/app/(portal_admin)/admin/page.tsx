"use client";

import { CaseManagerAmDashboard } from "@/components/case-manager/CaseManagerAmDashboard";

export default function AdminHomePage() {
  return (
    <CaseManagerAmDashboard
      variant="full"
      apiPath="/api/admin/cases"
      detailHrefBase="/admin/cases"
      headingMode="admin"
    />
  );
}
