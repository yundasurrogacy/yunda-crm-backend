"use client";

import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

type Props = {
  title: ReactNode;
  /** 展开时显示在标题下方 */
  description?: ReactNode;
  /** 收起时显示在标题旁的一行摘要 */
  summary?: ReactNode;
  /** 标题行右侧（不触发折叠，如「查看资料」链接） */
  headerAside?: ReactNode;
  defaultOpen?: boolean;
  /** 记住展开/收起；建议按案例+区块唯一 */
  storageKey?: string;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

function readStored(key: string, fallback: boolean): boolean {
  try {
    const v = window.localStorage.getItem(key);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch {
    /* ignore */
  }
  return fallback;
}

function writeStored(key: string, open: boolean) {
  try {
    window.localStorage.setItem(key, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function CollapsibleCard({
  title,
  description,
  summary,
  headerAside,
  defaultOpen = true,
  storageKey,
  onOpenChange,
  children,
  className,
  bodyClassName,
}: Props) {
  const { t } = useTranslation("common");
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    const next = storageKey ? readStored(storageKey, defaultOpen) : defaultOpen;
    setOpen(next);
    onOpenChangeRef.current?.(next);
  }, [storageKey, defaultOpen]);

  const toggle = () => {
    const next = !open;
    if (storageKey) writeStored(storageKey, next);
    setOpen(next);
    onOpenChangeRef.current?.(next);
  };

  return (
    <section className={["crm-card !p-0", className ?? ""].join(" ")}>
      <div className="flex items-start gap-2 px-5 py-4 md:px-6 md:py-5">
        <button
          type="button"
          className="ami-ui group min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--crm-ring)]"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
        >
          <div className="flex items-start gap-2">
            <ChevronDown
              className={[
                "mt-1 h-4 w-4 shrink-0 text-sage-600 transition-transform duration-200",
                open ? "rotate-0" : "-rotate-90",
              ].join(" ")}
              aria-hidden
              strokeWidth={2}
            />
            <div className="min-w-0 flex-1">
              <h2 className="crm-font-display text-lg font-semibold text-brand-brown">{title}</h2>
              {open && description ? (
                <div className="mt-1 text-sm text-sage-700">{description}</div>
              ) : null}
              {!open && summary ? (
                <div className="mt-1 truncate text-sm text-sage-800">{summary}</div>
              ) : null}
              <span className="sr-only">
                {open ? t("collapse_section") : t("expand_section")}
              </span>
            </div>
          </div>
        </button>
        {headerAside ? <div className="shrink-0 pt-0.5">{headerAside}</div> : null}
      </div>

      {open ? (
        <div
          id={panelId}
          role="region"
          className={[
            "border-t border-sage-200/70 px-5 py-4 md:px-6 md:py-5",
            bodyClassName ?? "",
          ].join(" ")}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
