"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export type EntitySearchOption = {
  id: string;
  label: string;
};

type Props = {
  options: EntitySearchOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
};

function matchesQuery(label: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return label.toLowerCase().includes(q);
}

/** 业务主体选择：支持按邮箱/姓名/ID 关键字过滤。 */
export function EntitySearchSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyLabel,
  allowEmpty,
  disabled,
  className,
  id,
}: Props) {
  const { t } = useTranslation("portal");
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const canEmpty = allowEmpty ?? Boolean(emptyLabel);
  const selected = options.find((o) => o.id === value) ?? null;
  const ph = placeholder ?? t("entity_search.placeholder");

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    return options.filter((o) => matchesQuery(o.label, query));
  }, [options, query]);

  const displayValue = open ? query : selected?.label ?? "";

  return (
    <div ref={rootRef} className={["relative", className].filter(Boolean).join(" ")}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder={selected && !open ? undefined : ph}
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        className="crm-font-ui block w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm text-sage-900 shadow-sm placeholder:text-sage-400 transition focus:border-brand-brown focus:outline-none focus:ring-[3px] focus:ring-brand-brown/30 disabled:cursor-not-allowed disabled:bg-sage-100/80"
      />
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-md border border-sage-200 bg-white py-1 text-sm shadow-lg ring-1 ring-sage-900/5"
        >
          {canEmpty ? (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                className={[
                  "block w-full px-3 py-2 text-left text-sage-700 hover:bg-sage-100",
                  value === "" ? "bg-sage-50 font-medium" : "",
                ].join(" ")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                {emptyLabel || "—"}
              </button>
            </li>
          ) : null}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sage-500">{t("entity_search.no_matches")}</li>
          ) : (
            filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === value}
                  className={[
                    "block w-full px-3 py-2 text-left text-sage-900 hover:bg-sage-100",
                    o.id === value ? "bg-sage-50 font-medium" : "",
                  ].join(" ")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
