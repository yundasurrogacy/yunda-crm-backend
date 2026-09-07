"use client";

import { CHILD_SEX, DELIVERY_METHOD } from "@/constants/gc-profile-schema";
import { SelectMenu } from "@/components/ui/SelectMenu";
import {
  emptyBirthHistoryEntry,
  type BirthHistoryEntry,
} from "@/lib/profile/birth-history";

type Props = {
  entries: BirthHistoryEntry[];
  onChange: (entries: BirthHistoryEntry[]) => void;
  zh: boolean;
  disabled?: boolean;
};

const inputClass =
  "mt-1 block w-full rounded-md border border-sage-300/90 bg-white px-3 py-2 text-sm text-sage-900 shadow-sm";

export function BirthHistoryEditor({ entries, onChange, zh, disabled }: Props) {
  const rows = entries.length ? entries : [emptyBirthHistoryEntry()];

  function patch(index: number, next: Partial<BirthHistoryEntry>) {
    const copy = rows.map((row, i) => (i === index ? { ...row, ...next } : row));
    onChange(copy);
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <p className="text-xs text-sage-600">
        {zh ? "可添加多次生产记录。" : "Add one row for each prior birth."}
      </p>
      {rows.map((entry, index) => (
        <div
          key={index}
          className="rounded-lg border border-sage-200/80 bg-white/70 p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-sage-700">
              {zh ? `第 ${index + 1} 次` : `Birth ${index + 1}`}
            </p>
            {rows.length > 1 ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                className="text-xs font-semibold text-red-800 hover:underline disabled:opacity-50"
              >
                {zh ? "删除这次" : "Remove"}
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-sage-700">
              {zh ? "生产日期" : "Delivery date"}
              <input
                type="date"
                className={inputClass}
                value={entry.delivery_date}
                onChange={(e) => patch(index, { delivery_date: e.target.value })}
                disabled={disabled}
              />
            </label>
            <label className="text-xs font-semibold text-sage-700">
              {zh ? "孕周" : "Gestational weeks"}
              <input
                className={inputClass}
                value={entry.gestational_weeks}
                onChange={(e) => patch(index, { gestational_weeks: e.target.value })}
                disabled={disabled}
              />
            </label>
            <label className="text-xs font-semibold text-sage-700">
              {zh ? "出生体重" : "Birth weight"}
              <input
                className={inputClass}
                value={entry.weight}
                onChange={(e) => patch(index, { weight: e.target.value })}
                disabled={disabled}
              />
            </label>
            <label className="text-xs font-semibold text-sage-700">
              {zh ? "性别" : "Child sex"}
              <div className="mt-1">
                <SelectMenu
                  value={entry.child_sex}
                  onChange={(v) => patch(index, { child_sex: v })}
                  disabled={disabled}
                  options={[
                    { value: "", label: "—" },
                    ...CHILD_SEX.map((opt) => ({
                      value: opt.value,
                      label: zh ? opt.labelZh : opt.labelEn,
                    })),
                  ]}
                />
              </div>
            </label>
            <label className="text-xs font-semibold text-sage-700 sm:col-span-2">
              {zh ? "生产方式" : "Delivery method"}
              <div className="mt-1">
                <SelectMenu
                  value={entry.delivery_method}
                  onChange={(v) => patch(index, { delivery_method: v })}
                  disabled={disabled}
                  options={[
                    { value: "", label: "—" },
                    ...DELIVERY_METHOD.map((opt) => ({
                      value: opt.value,
                      label: zh ? opt.labelZh : opt.labelEn,
                    })),
                  ]}
                />
              </div>
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([...rows, emptyBirthHistoryEntry()])}
        className="rounded-md border border-sage-300 bg-white px-3 py-1.5 text-xs font-semibold text-sage-800 hover:bg-sage-50 disabled:opacity-50"
      >
        {zh ? "添加一次生产记录" : "Add another birth"}
      </button>
    </div>
  );
}
