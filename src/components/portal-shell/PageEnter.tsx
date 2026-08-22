"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** 路由切换时给内容区轻微入场动效；宽度由壳层统一，避免各页再叠一层边距 */
export function PageEnter({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  return (
    <div key={pathname} className="crm-page-enter mx-auto w-full max-w-6xl">
      {children}
    </div>
  );
}
