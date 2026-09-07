export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export function parsePageSize(raw: string | null | undefined): PageSizeOption {
  const n = parseInt(raw ?? "", 10);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? (n as PageSizeOption) : DEFAULT_PAGE_SIZE;
}

export function clampPage(page: number, total: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
  return Math.min(Math.max(1, page), totalPages);
}
