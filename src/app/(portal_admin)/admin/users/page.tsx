import { Suspense } from "react";
import { AdminUsersManager } from "@/components/admin/AdminUsersManager";

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-sage-600">Loading…</p>}>
      <AdminUsersManager />
    </Suspense>
  );
}
