"use client";

import { Link } from "@/components/ui/AppLink";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { listHrefForBack } from "@/lib/crm-list-return";

export function ListBackLink({
  fallbackHref,
  children,
}: {
  fallbackHref: string;
  children: React.ReactNode;
}) {
  const [href, setHref] = useState(fallbackHref);
  useEffect(() => {
    setHref(listHrefForBack(fallbackHref));
  }, [fallbackHref]);
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
