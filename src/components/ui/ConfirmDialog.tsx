"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

export type ConfirmOptions = {
  /** 正文；也可直接传 string 给 confirm() */
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 危险操作：确认按钮用偏警示色 */
  danger?: boolean;
};

type Pending = ConfirmOptions & {
  resolve: (ok: boolean) => void;
};

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

function normalizeOptions(options: ConfirmOptions | string): ConfirmOptions {
  if (typeof options === "string") return { message: options };
  return options;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation("portal");
  const [pending, setPending] = useState<Pending | null>(null);
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    const opts = normalizeOptions(options);
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    setPending((cur) => {
      cur?.resolve(ok);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, close]);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {pending ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-sage-950/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="ami-ui w-full max-w-md rounded-xl border border-sage-200 bg-[#faf8f4] p-5 shadow-lg"
          >
            <h2 id={titleId} className="crm-font-display text-lg font-semibold text-brand-brown">
              {pending.title ?? t("confirm_dialog.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-sage-800 whitespace-pre-wrap">
              {pending.message}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => close(false)}
                className="rounded-md border border-sage-400 bg-white px-4 py-2 text-sm font-semibold text-sage-800 hover:bg-sage-50"
              >
                {pending.cancelLabel ?? t("confirm_dialog.cancel")}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={
                  pending.danger
                    ? "rounded-md border border-red-800 bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                    : "rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                }
              >
                {pending.confirmLabel ?? t("confirm_dialog.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    // 无 Provider 时降级（应避免）；保持异步签名
    return async (options) => {
      const msg = typeof options === "string" ? options : options.message;
      return window.confirm(msg);
    };
  }
  return ctx;
}
