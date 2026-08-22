"use client";

import { AdminCaseManagerWorkload } from "@/components/admin/AdminCaseManagerWorkload";
import { CaseManagerAmDashboard } from "@/components/case-manager/CaseManagerAmDashboard";

export default function AdminHomePage() {
  return (
    <>
      <AdminCaseManagerWorkload />
      <CaseManagerAmDashboard
        variant="full"
        apiPath="/api/admin/cases"
        detailHrefBase="/admin/cases"
        headingMode="admin"
      />
    </>
  );
}
