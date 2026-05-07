"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export type BindModalKind = "case_manager" | "intended_parent" | "surrogate_mother";

type UserSearchRow = {
  userId: string;
  email: string;
  role: string;
  caseManagerId: string | null;
  intendedParentId: string | null;
  surrogateId: string | null;
};

function linkageEntityId(user: UserSearchRow, kind: BindModalKind): string | null {
  switch (kind) {
    case "case_manager":
      return user.caseManagerId;
    case "intended_parent":
      return user.intendedParentId;
    case "surrogate_mother":
      return user.surrogateId;
    default:
      return null;
  }
}

/** 该用户是否已被绑定到「另一条」同类业务记录（无法再绑到本行）。 */
function isBlockedForEntity(user: UserSearchRow, kind: BindModalKind, entityId: string): boolean {
  const linked = linkageEntityId(user, kind);
  return linked != null && linked !== entityId;
}

type Props = {
  open: boolean;
  mode: "bind" | "rebind";
  kind: BindModalKind;
  entityId: string;
  onClose: () => void;
  onLinked: () => void;
  setBanner: (msg: string | null) => void;
};

export function BindLoginUserModal({ open, mode, kind, entityId, onClose, onLinked, setBanner }: Props) {
  const { t } = useTranslation("portal");
  const [searchQ, setSearchQ] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [users, setUsers] = useState<UserSearchRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<UserSearchRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const titleKey = mode === "rebind" ? "admin_accounts.modal_title_rebind" : "admin_accounts.modal_title_bind";

  const fetchList = useCallback(
    async (qTrim: string) => {
      setBanner(null);
      setSearchLoading(true);
      setSelected(null);
      setUsers([]);
      try {
        const url = new URL("/api/admin/users", window.location.origin);
        url.searchParams.set("page", "1");
        url.searchParams.set("pageSize", "30");
        if (qTrim) url.searchParams.set("q", qTrim);
        const res = await fetch(url.pathname + url.search);
        if (!res.ok) throw new Error("search_failed");
        const json = (await res.json()) as { rows?: UserSearchRow[] };
        setUsers(json.rows ?? []);
        setSearched(true);
      } catch {
        setBanner(t("admin_accounts.modal_search_error"));
        setUsers([]);
        setSearched(true);
      } finally {
        setSearchLoading(false);
      }
    },
    [setBanner, t],
  );

  useEffect(() => {
    if (!open) return;
    setSearchQ("");
    setSubmitting(false);
    void fetchList("");
  }, [open, entityId, mode, kind, fetchList]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function runSearch() {
    await fetchList(searchQ.trim());
  }

  async function confirmLink() {
    if (!selected) {
      setBanner(t("admin_accounts.error_link_select_user"));
      return;
    }
    if (isBlockedForEntity(selected, kind, entityId)) {
      setBanner(t("admin_accounts.error_link_user_conflict"));
      return;
    }
    setBanner(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/accounts/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, entityId, userEmail: selected.email }),
      });
      const errJson = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const code = errJson.error;
        if (code === "user_not_found") setBanner(t("admin_accounts.error_link_user_not_found"));
        else if (code === "entity_not_found") setBanner(t("admin_accounts.error_link_entity_not_found"));
        else if (code === "user_bound_elsewhere") setBanner(t("admin_accounts.error_link_user_conflict"));
        else setBanner(t("admin_accounts.error_link"));
        return;
      }
      setBanner(t("admin_accounts.linked"));
      onLinked();
      onClose();
    } catch {
      setBanner(t("admin_accounts.error_link"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(560px,85vh)] w-full max-w-lg flex-col rounded-xl border border-sage-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bind-login-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-sage-100 px-5 py-4">
          <h2 id="bind-login-modal-title" className="crm-font-display text-lg font-semibold text-brand-brown">
            {t(titleKey)}
          </h2>
          <p className="mt-1 text-xs text-sage-600">{t("admin_accounts.modal_intro")}</p>
        </div>

        <div className="flex shrink-0 gap-2 border-b border-sage-100 px-5 py-3">
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch();
            }}
            placeholder={t("admin_accounts.modal_search_ph")}
            className="min-w-0 flex-1 rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={searchLoading}
            className="shrink-0 rounded-md bg-sage-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {searchLoading ? t("admin_accounts.modal_searching") : t("admin_accounts.modal_search")}
          </button>
        </div>

        <div className="min-h-[200px] flex-1 overflow-y-auto px-3 py-2">
          {searchLoading && !searched ? (
            <p className="px-2 py-8 text-center text-sm text-sage-600">{t("admin_accounts.modal_searching")}</p>
          ) : !searched ? (
            <p className="px-2 py-8 text-center text-sm text-sage-500">{t("admin_accounts.modal_hint_search")}</p>
          ) : users.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-sage-600">{t("admin_accounts.modal_no_results")}</p>
          ) : (
            <ul className="space-y-1">
              {users.map((u) => {
                const blocked = isBlockedForEntity(u, kind, entityId);
                const isSel = selected?.userId === u.userId;
                return (
                  <li key={u.userId}>
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => !blocked && setSelected(u)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        blocked
                          ? "cursor-not-allowed border-sage-100 bg-sage-50 text-sage-400"
                          : isSel
                            ? "border-brand-brown bg-brand-brown/10 text-brand-brown"
                            : "border-transparent bg-white hover:border-sage-200 hover:bg-sage-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{u.email}</span>
                        <span className="text-xs text-sage-500">
                          ID {u.userId} · {u.role}
                        </span>
                      </div>
                      {blocked ? (
                        <p className="mt-1 text-xs text-amber-700">{t("admin_accounts.modal_row_conflict")}</p>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-sage-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-sage-300 bg-white px-4 py-2 text-sm font-medium text-sage-800"
          >
            {t("admin_accounts.modal_cancel")}
          </button>
          <button
            type="button"
            onClick={() => void confirmLink()}
            disabled={submitting || !selected || isBlockedForEntity(selected, kind, entityId)}
            className="rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {submitting ? t("admin_accounts.modal_confirming") : t("admin_accounts.modal_confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
