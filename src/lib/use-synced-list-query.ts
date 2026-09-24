"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_PAGE_SIZE, parsePageSize, type PageSizeOption } from "@/lib/crm-pagination";
import {
  DEFAULT_RECORD_FILTER,
  parseRecordFilterFromParams,
  recordFilterParam,
  type RecordFilter,
} from "@/constants/record-filter";

export type ListQueryPatch = {
  page?: number;
  pageSize?: PageSizeOption;
  q?: string;
  /** 记录状态三态：全部 / 正常 / 已删除（默认 正常） */
  status?: RecordFilter;
};

export function useSyncedListQuery() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const q = (searchParams.get("q") ?? "").trim();
  const status = parseRecordFilterFromParams(
    searchParams.get("status"),
    searchParams.get("includeDeleted"),
  );

  const href = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const replaceQuery = useCallback(
    (patch: ListQueryPatch) => {
      const nextPage = patch.page ?? page;
      const nextPageSize = patch.pageSize ?? pageSize;
      const nextQ = (patch.q !== undefined ? patch.q : q).trim();
      const nextStatus = patch.status ?? status;
      const params = new URLSearchParams();
      if (nextPage > 1) params.set("page", String(nextPage));
      if (nextPageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(nextPageSize));
      if (nextQ) params.set("q", nextQ);
      const statusParam = recordFilterParam(nextStatus);
      if (statusParam) params.set("status", statusParam);
      const qs = params.toString();
      const next = qs ? `${pathname}?${qs}` : pathname;
      if (next === href) return;
      router.replace(next, { scroll: false });
    },
    [href, page, pageSize, pathname, q, router, status],
  );

  return { page, pageSize, q, status, href, replaceQuery, pathname };
}

export { DEFAULT_RECORD_FILTER };

export function hrefWithReturnTo(path: string, returnTo: string) {
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}returnTo=${encodeURIComponent(returnTo)}`;
}
