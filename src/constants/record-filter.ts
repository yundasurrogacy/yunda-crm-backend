/**
 * 列表「记录状态」三态筛选：全部 / 正常 / 已删除。
 *
 * 背景：账号类（案例经理 / 准父母 / 代孕母）用 `deleted_at` 表示软删除，
 * 案例用 `archived_at` 表示软删除；两者语义一致，因此共用同一套枚举与 URL 参数。
 *
 * URL 参数统一为 `status`，取值为 `all` / `active` / `deleted`；
 * 默认 `active`（只看正常记录），默认值不写入 URL，保持链接干净。
 */

/** UI 展示顺序：全部 / 正常 / 已删除 */
export const RECORD_FILTERS = ["all", "active", "deleted"] as const;

export type RecordFilter = (typeof RECORD_FILTERS)[number];

export const DEFAULT_RECORD_FILTER: RecordFilter = "active";

export function isRecordFilter(value: unknown): value is RecordFilter {
  return typeof value === "string" && (RECORD_FILTERS as readonly string[]).includes(value);
}

export function parseRecordFilter(raw: string | null | undefined): RecordFilter {
  const v = raw?.trim().toLowerCase();
  return isRecordFilter(v) ? v : DEFAULT_RECORD_FILTER;
}

/**
 * 解析 URL 中的状态筛选，并兼容历史参数。
 * - `status` 优先
 * - 旧的 `includeDeleted=1` 等价于「全部」（历史书签/返链仍可用）
 */
export function parseRecordFilterFromParams(
  status: string | null | undefined,
  legacyIncludeDeleted?: string | null,
): RecordFilter {
  if (status?.trim()) return parseRecordFilter(status);
  return legacyIncludeDeleted === "1" ? "all" : DEFAULT_RECORD_FILTER;
}

/** 写入 URL 用的参数值；等于默认值时返回 null（不写参数） */
export function recordFilterParam(filter: RecordFilter): string | null {
  return filter === DEFAULT_RECORD_FILTER ? null : filter;
}
