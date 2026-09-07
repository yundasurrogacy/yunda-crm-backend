"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { BindRoleKind } from "@/lib/admin/bind-user-role";
import { OverlayPortal } from "@/components/ui/OverlayPortal";

type Option = { id: string; label: string };

type Props = {
  open: boolean;
  userId: string;
  userEmail: string;
  kind: BindRoleKind;
  onClose: () => void;
  onBound: () => void;
  setBanner: (msg: string | null) => void;
};

export function BindEntityToUserModal({
  open,
  userId,
  userEmail,
  kind,
  onClose,
  onBound,
  setBanner,
}: Props) {
  const { t } = useTranslation("portal");
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searched, setSearched] = useState(false);

  const kindLabel =
    kind === "case_manager"
      ? t("admin_users.kind_cm")
      : kind === "intended_parent"
        ? t("admin_users.kind_ip")
        : t("admin_users.kind_sm");

  const fetchOptions = useCallback(
    async (query: string) => {
      setLoading(true);
      setSelectedId("");
      try {
        const url = new URL("/api/admin/users/unbound-entities", window.location.origin);
        url.searchParams.set("kind", kind);
        if (query.trim()) url.searchParams.set("q", query.trim());
        const res = await fetch(url.pathname + url.search);
        if (!res.ok) throw new Error("load");
        const json = (await res.json()) as { options?: Option[] };
        setOptions(json.options ?? []);
        setSearched(true);
      } catch {
        setOptions([]);
        setSearched(true);
        setBanner(t("admin_users.bind_modal_load_error"));
      } finally {
        setLoading(false);
      }
    },
    [kind, setBanner, t],
  );

  useEffect(() => {
    if (!open) return;
    setQ("");
    setSubmitting(false);
    void fetchOptions("");
  }, [open, userId, kind, fetchOptions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function confirm(mode: "select" | "create") {
    if (mode === "select" && !selectedId) {
      setBanner(t("admin_users.bind_modal_pick_required"));
      return;
    }
    setBanner(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "create"
            ? { userId, kind, createNew: true }
            : { userId, kind, entityId: selectedId },
        ),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        alreadyLinked?: boolean;
        reclaimed?: boolean;
      };
      if (!res.ok) {
        if (json.error === "user_bound_elsewhere") {
          setBanner(t("admin_users.error_bind_conflict"));
        } else if (json.error === "insert_failed") {
          setBanner(t("admin_users.error_bind_insert"));
        } else {
          setBanner(t("admin_users.error_bind"));
        }
        return;
      }
      setBanner(
        json.alreadyLinked
          ? t("admin_users.bind_already")
          : json.reclaimed
            ? t("admin_users.bind_reclaimed")
            : t("admin_users.bind_ok"),
      );
      onBound();
      onClose();
    } catch {
      setBanner(t("admin_users.error_bind"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <OverlayPortal>
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(560px,85vh)] w-full max-w-lg flex-col rounded-xl border border-sage-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bind-entity-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-sage-100 px-5 py-4">
          <h2 id="bind-entity-modal-title" className="crm-font-display text-lg font-semibold text-brand-brown">
            {t("admin_users.bind_modal_title", { kind: kindLabel })}
          </h2>
          <p className="mt-1 text-xs text-sage-600">
            {t("admin_users.bind_modal_intro", { email: userEmail })}
          </p>
        </div>

        <div className="flex shrink-0 gap-2 border-b border-sage-100 px-5 py-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void fetchOptions(q);
            }}
            placeholder={t("admin_users.bind_modal_search_ph")}
            className="min-w-0 flex-1 rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void fetchOptions(q)}
            disabled={loading}
            className="crm-btn crm-btn-primary crm-btn-sm shrink-0"
          >
            {loading ? t("admin_users.bind_modal_searching") : t("admin_users.bind_modal_search")}
          </button>
        </div>

        <div className="min-h-[200px] flex-1 overflow-y-auto px-3 py-2">
          {loading && !searched ? (
            <p className="px-2 py-8 text-center text-sm text-sage-600">
              {t("admin_users.bind_modal_searching")}
            </p>
          ) : options.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-sage-600">
              {t("admin_users.bind_modal_empty")}
            </p>
          ) : (
            <ul className="space-y-1">
              {options.map((o) => {
                const isSel = selectedId === o.id;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(o.id)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        isSel
                          ? "border-brand-brown bg-brand-brown/10 text-brand-brown"
                          : "border-transparent bg-white hover:border-sage-200 hover:bg-sage-50"
                      }`}
                    >
                      <span className="font-medium break-all">{o.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-sage-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="crm-btn crm-btn-secondary"
          >
            {t("admin_users.bind_modal_cancel")}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void confirm("create")}
            className="crm-btn crm-btn-secondary"
          >
            {submitting ? t("admin_users.bind_modal_saving") : t("admin_users.bind_modal_create_new")}
          </button>
          <button
            type="button"
            disabled={submitting || !selectedId}
            onClick={() => void confirm("select")}
            className="crm-btn crm-btn-primary"
          >
            {submitting ? t("admin_users.bind_modal_saving") : t("admin_users.bind_modal_confirm")}
          </button>
        </div>
      </div>
    </div>
    </OverlayPortal>
  );
}
