"use client";

import { AdminCaseManagerWorkload } from "@/components/admin/AdminCaseManagerWorkload";
import { CaseManagerAmDashboard } from "@/components/case-manager/CaseManagerAmDashboard";

export default function AdminHomePage() {
  return (
    <div className="crm-page">
      <CaseManagerAmDashboard
        variant="full"
        apiPath="/api/admin/cases"
        detailHrefBase="/admin/cases"
        headingMode="admin"
      />
      <AdminCaseManagerWorkload />
    </div>
  );
}
