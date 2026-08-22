"use client";

import type { ProfileFieldDef } from "@/constants/gc-profile-schema";
import { SelectMenu } from "@/components/ui/SelectMenu";

const inputClass =
  "mt-1 block w-full rounded-md border border-sage-300/90 bg-white px-3 py-2 text-sm font-normal normal-case text-sage-900 shadow-sm";

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
      <div className="mt-1">
        <SelectMenu
          value={value}
          onChange={onChange}
          disabled={disabled}
          searchable={field.options.length > 8}
          options={[
            { value: "", label: "—" },
            ...field.options.map((opt) => ({
              value: opt.value,
              label: zh ? opt.labelZh : opt.labelEn,
            })),
          ]}
        />
      </div>
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
