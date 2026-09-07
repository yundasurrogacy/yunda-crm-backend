"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { OverlayPortal } from "./OverlayPortal";

export function CrmModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <OverlayPortal>
    <div
      className="crm-dialog-backdrop fixed inset-0 z-[100] flex items-end justify-center bg-[color:color-mix(in_srgb,var(--bark)_42%,transparent)] p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="crm-dialog-panel ami-ui flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-sage-200 bg-[var(--crm-surface-solid)] shadow-[0_24px_48px_rgba(60,36,21,0.18)] sm:rounded-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-sage-200 px-5 py-4">
          <h2 id={titleId} className="crm-font-display min-w-0 flex-1 pr-2 text-xl font-semibold leading-snug text-brand-brown">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-1 text-lg leading-none text-bark hover:bg-sage-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
    </OverlayPortal>
  );
}
