"use client";

import type { ProfileFieldDef } from "@/constants/gc-profile-schema";

const inputClass =
  "mt-1 block w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm font-normal normal-case text-sage-900";

export function ProfileFieldControl({
  field,
  value,
  onChange,
  zh,
  disabled,
}: {
  field: ProfileFieldDef;
  value: string;
  onChange: (v: string) => void;
  zh: boolean;
  disabled?: boolean;
}) {
  if (field.options && field.options.length > 0) {
    return (
      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">—</option>
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {zh ? opt.labelZh : opt.labelEn}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="text"
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}
