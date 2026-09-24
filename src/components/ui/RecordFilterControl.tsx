"use client";

import { useTranslation } from "react-i18next";

import {
  RECORD_FILTERS,
  type RecordFilter,
} from "@/constants/record-filter";

/**
 * 「全部 / 正常 / 已删除」三态分段筛选控件。
 *
 * 管理端与案例经理端的账号、案例列表共用，保证各处交互一致。
 * labels 取自 common 命名空间 `record_filter.*`。
 */
export function RecordFilterControl({
  value,
  onChange,
  disabled = false,
  className = "",
  deletedLabel,
}: {
  value: RecordFilter;
  onChange: (next: RecordFilter) => void;
  disabled?: boolean;
  className?: string;
  /**
   * 覆盖第三个选项的文案。部分列表的「已删除」实际语义是「已停用」
   * （如账号列表用 disabled_at），传入该 prop 即可复用本控件。
   */
  deletedLabel?: string;
}) {
  const { t } = useTranslation("common");

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-xs text-sage-700">{t("record_filter.label")}</span>
      <div
        role="group"
        aria-label={t("record_filter.label")}
        className="inline-flex overflow-hidden rounded-md border border-sage-300 bg-white"
      >
        {RECORD_FILTERS.map((filter, i) => {
          const active = filter === value;
          const label =
            filter === "deleted" && deletedLabel
              ? deletedLabel
              : t(`record_filter.${filter}`);
          return (
            <button
              key={filter}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => {
                if (filter !== value) onChange(filter);
              }}
              className={[
                "px-3 py-1.5 text-xs font-medium transition-colors",
                i > 0 ? "border-l border-sage-300" : "",
                active
                  ? "bg-brand-brown text-white"
                  : "bg-white text-sage-700 hover:bg-sage-50",
                disabled ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
