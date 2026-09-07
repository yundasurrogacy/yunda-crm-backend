import { Suspense } from "react";
import { CaseManagerAmDashboard } from "@/components/case-manager/CaseManagerAmDashboard";

export default function AdminCasesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-sage-600">Loading…</p>}>
      <CaseManagerAmDashboard
        variant="stageList"
        apiPath="/api/admin/cases"
        detailHrefBase="/admin/cases"
        headingMode="admin"
        createCaseMode="admin"
      />
    </Suspense>
  );
}
