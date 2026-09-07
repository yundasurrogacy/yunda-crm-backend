"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export type SelectMenuOption = {
  value: string;
  label: string;
};

type Props = {
  options: SelectMenuOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** 选项较多时开启本地过滤 */
  searchable?: boolean;
  compact?: boolean;
  placement?: "down" | "up";
};

const triggerClass =
  "crm-font-ui flex w-full items-center justify-between gap-2 rounded-md border border-sage-300/90 bg-white px-3 py-2 text-left text-sm text-sage-900 shadow-sm transition hover:border-sage-400 focus:border-brand-brown focus:outline-none focus:ring-[3px] focus:ring-brand-brown/30 disabled:cursor-not-allowed disabled:bg-sage-100/80 disabled:opacity-70";

/** 主题风格下拉：替代原生 `<select>` 的系统菜单。 */
export function SelectMenu({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  id,
  searchable = false,
  compact = false,
  placement = "down",
}: Props) {
  const { t } = useTranslation("common");
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  return (
    <div ref={rootRef} className={["relative", className].filter(Boolean).join(" ")}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        className={compact ? `${triggerClass} px-2.5 py-1.5 text-xs` : triggerClass}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
      >
        <span className={selected ? "min-w-0 truncate" : "min-w-0 truncate text-sage-400"}>
          {selected?.label ?? placeholder ?? t("select_placeholder")}
        </span>
        <ChevronDown
          className={[
            "h-4 w-4 shrink-0 text-sage-500 transition-transform duration-150",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden
          strokeWidth={2}
        />
      </button>

      {open && !disabled ? (
        <div
          className={[
            "absolute z-50 w-full overflow-hidden rounded-md border border-sage-200 bg-white shadow-lg ring-1 ring-sage-900/5",
            placement === "up" ? "bottom-full mb-1" : "mt-1",
          ].join(" ")}
        >
          {searchable ? (
            <div className="border-b border-sage-100 p-2">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("select_search")}
                className="crm-font-ui w-full rounded-md border border-sage-200 bg-sage-50/80 px-2.5 py-1.5 text-sm text-sage-900 placeholder:text-sage-400 focus:border-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/25"
              />
            </div>
          ) : null}
          <ul
            id={listId}
            role="listbox"
            className="max-h-60 overflow-auto py-1 text-sm"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sage-500">{t("select_no_matches")}</li>
            ) : (
              filtered.map((o) => {
                const active = o.value === value;
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={[
                        "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
                        active
                          ? "bg-sage-100 font-medium text-sage-900"
                          : "text-sage-800 hover:bg-sage-50",
                      ].join(" ")}
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{o.label}</span>
                      {active ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-brand-brown" aria-hidden strokeWidth={2.5} />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
