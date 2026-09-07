"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { listHrefForBack } from "@/lib/crm-list-return";

export function ListBackLink({
  fallbackHref,
  children,
}: {
  fallbackHref: string;
  children: React.ReactNode;
}) {
  const href = useMemo(() => listHrefForBack(fallbackHref), [fallbackHref]);
  return (
    <Link
      href={href}
      className="ami-ui inline-flex items-center gap-1.5 rounded-md border border-bark bg-petal px-3 py-2 text-sm font-semibold text-bark shadow-sm hover:bg-maple"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
      {children}
    </Link>
  );
}
