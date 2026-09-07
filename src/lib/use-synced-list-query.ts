"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_PAGE_SIZE, parsePageSize, type PageSizeOption } from "@/lib/crm-pagination";

export type ListQueryPatch = {
  page?: number;
  pageSize?: PageSizeOption;
  q?: string;
  includeDeleted?: boolean;
};

export function useSyncedListQuery() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const q = (searchParams.get("q") ?? "").trim();
  const includeDeleted = searchParams.get("includeDeleted") === "1";

  const href = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const replaceQuery = useCallback(
    (patch: ListQueryPatch) => {
      const nextPage = patch.page ?? page;
      const nextPageSize = patch.pageSize ?? pageSize;
      const nextQ = (patch.q !== undefined ? patch.q : q).trim();
      const nextDeleted = patch.includeDeleted ?? includeDeleted;
      const params = new URLSearchParams();
      if (nextPage > 1) params.set("page", String(nextPage));
      if (nextPageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(nextPageSize));
      if (nextQ) params.set("q", nextQ);
      if (nextDeleted) params.set("includeDeleted", "1");
      const qs = params.toString();
      const next = qs ? `${pathname}?${qs}` : pathname;
      if (next === href) return;
      router.replace(next, { scroll: false });
    },
    [href, includeDeleted, page, pageSize, pathname, q, router],
  );

  return { page, pageSize, q, includeDeleted, href, replaceQuery, pathname };
}

export function hrefWithReturnTo(path: string, returnTo: string) {
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}returnTo=${encodeURIComponent(returnTo)}`;
}
