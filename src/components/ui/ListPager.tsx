"use client";

import { useTranslation } from "react-i18next";
import { PAGE_SIZE_OPTIONS, type PageSizeOption } from "@/lib/crm-pagination";
import { SelectMenu } from "./SelectMenu";

export function ListPager({
  page,
  totalPages,
  pageSize,
  disabled,
  stats,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  disabled?: boolean;
  stats: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSizeOption) => void;
}) {
  const { t } = useTranslation("portal");
  const size = String(pageSize);

  return (
    <div className="crm-pager">
      <p className="min-w-0">{stats}</p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-sage-700">
          <span className="shrink-0">{t("pager.page_size")}</span>
          <SelectMenu
            compact
            placement="up"
            className="w-[7.5rem]"
            value={size}
            onChange={(v) => onPageSizeChange(Number(v) as PageSizeOption)}
            options={PAGE_SIZE_OPTIONS.map((n) => ({
              value: String(n),
              label: t("pager.page_size_option", { n }),
            }))}
          />
        </label>
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="crm-btn crm-btn-secondary crm-btn-sm"
        >
          {t("pager.prev")}
        </button>
        <span className="tabular-nums text-sage-800">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="crm-btn crm-btn-secondary crm-btn-sm"
        >
          {t("pager.next")}
        </button>
      </div>
    </div>
  );
}
