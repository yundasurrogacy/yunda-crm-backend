"use client";

import { Suspense } from "react";
import { AdminAccountManager } from "@/components/admin/AdminAccountManager";

export default function AdminSurrogatesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-sage-600">Loading…</p>}>
      <AdminAccountManager kind="surrogate_mother" />
    </Suspense>
  );
}
