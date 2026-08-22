"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AmCaseDetail } from "@/lib/case-manager/fetch-case-detail";
import type { CaseGcHistoryRow } from "@/lib/case-manager/case-gc-history";
import type { CaseMessageRow } from "@/lib/case-manager/case-messages";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Props = {
  caseId: string;
  apiPathBase: string;
  detail: AmCaseDetail;
  onDetailUpdated: (d: AmCaseDetail) => void;
  /** 换绑 GC 等外部操作后递增，用于刷新历史 */
  refreshTick?: number;
};

export function CaseP1OpsPanel({
  caseId,
  apiPathBase,
  detail,
  onDetailUpdated,
  refreshTick = 0,
}: Props) {
  const { t, i18n } = useTranslation("portal");
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [cycleNote, setCycleNote] = useState("");
  const [history, setHistory] = useState<CaseGcHistoryRow[]>([]);
  const [messages, setMessages] = useState<CaseMessageRow[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [emailNotify, setEmailNotify] = useState(false);

  const actionsUrl = `${apiPathBase}/${encodeURIComponent(caseId)}/actions`;
  const historyUrl = `${apiPathBase}/${encodeURIComponent(caseId)}/gc-history`;
  const messagesUrl = `${apiPathBase}/${encodeURIComponent(caseId)}/messages`;

  const reloadExtras = useCallback(async () => {
    try {
      const [hRes, mRes] = await Promise.all([fetch(historyUrl), fetch(messagesUrl)]);
      if (hRes.ok) {
        const json = (await hRes.json()) as { entries?: CaseGcHistoryRow[] };
        setHistory(json.entries ?? []);
      }
      if (mRes.ok) {
        const json = (await mRes.json()) as { messages?: CaseMessageRow[] };
        setMessages(json.messages ?? []);
      }
    } catch {
      /* ignore */
    }
  }, [historyUrl, messagesUrl]);

  useEffect(() => {
    void reloadExtras();
  }, [reloadExtras, refreshTick]);

  async function runAction(body: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(actionsUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setMsg(t("case_detail.p1.error_action"));
        return;
      }
      if (body.action === "archive" || body.action === "unarchive") {
        onDetailUpdated({
          ...detail,
          archived_at: body.action === "archive" ? new Date().toISOString() : null,
        });
        setMsg(
          body.action === "archive"
            ? t("case_detail.p1.archived_ok")
            : t("case_detail.p1.unarchived_ok"),
        );
      }
      if (body.action === "fail_cycle" && Array.isArray(json.cycles)) {
        onDetailUpdated({
          ...detail,
          cycles: json.cycles as AmCaseDetail["cycles"],
          current_cycle_id: String(json.current_cycle_id ?? ""),
        });
        setMsg(t("case_detail.p1.cycle_ok"));
        setCycleNote("");
      }
      await reloadExtras();
    } catch {
      setMsg(t("case_detail.p1.error_action"));
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!messageBody.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(messagesUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageBody, email_notify: emailNotify }),
      });
      const json = (await res.json().catch(() => ({}))) as { messages?: CaseMessageRow[] };
      if (!res.ok) {
        setMsg(t("case_detail.p1.error_message"));
        return;
      }
      setMessages(json.messages ?? []);
      setMessageBody("");
      setMsg(t("case_detail.p1.message_ok"));
    } catch {
      setMsg(t("case_detail.p1.error_message"));
    } finally {
      setBusy(false);
    }
  }

  const lng = i18n.language;
  const fmt = (iso: string) => {
    try {
      const d = new Date(iso);
      return lng.toLowerCase().startsWith("zh")
        ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(d)
        : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
    } catch {
      return iso;
    }
  };

  return (
    <section className="space-y-6 rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6">
      <h2 className="crm-font-display text-lg font-semibold text-brand-brown">{t("case_detail.p1.section_title")}</h2>
      {msg ? <p className="text-sm text-sage-800">{msg}</p> : null}

      <div className="flex flex-wrap gap-2">
        {detail.archived_at ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction({ action: "unarchive" })}
            className="rounded-md border border-sage-400 bg-white px-3 py-2 text-sm font-semibold"
          >
            {t("case_detail.p1.unarchive")}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                if (
                  await confirm({
                    message: t("case_detail.p1.archive_confirm"),
                    danger: true,
                  })
                ) {
                  void runAction({ action: "archive" });
                }
              })();
            }}
            className="rounded-md border border-amber-700 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950"
          >
            {t("case_detail.p1.archive")}
          </button>
        )}
        {detail.archived_at ? (
          <span className="self-center text-xs text-amber-900">
            {t("case_detail.p1.archived_at", { at: fmt(detail.archived_at) })}
          </span>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-sage-800">{t("case_detail.p1.cycles_title")}</h3>
        <ul className="mb-2 space-y-1 text-sm text-sage-700">
          {(detail.cycles ?? []).length === 0 ? (
            <li>{t("case_detail.p1.cycles_empty")}</li>
          ) : (
            detail.cycles.map((c) => (
              <li key={c.id}>
                #{c.id.slice(-6)} · {c.status}
                {c.note ? ` · ${c.note}` : ""}
              </li>
            ))
          )}
        </ul>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[12rem] flex-1 rounded-md border border-sage-300 px-3 py-2 text-sm"
            placeholder={t("case_detail.p1.cycle_note_ph")}
            value={cycleNote}
            onChange={(e) => setCycleNote(e.target.value)}
            disabled={busy}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                if (await confirm({ message: t("case_detail.p1.cycle_confirm"), danger: true })) {
                  void runAction({ action: "fail_cycle", note: cycleNote });
                }
              })();
            }}
            className="rounded-md bg-brand-brown px-3 py-2 text-sm font-semibold text-white"
          >
            {t("case_detail.p1.fail_cycle")}
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-sage-800">{t("case_detail.p1.gc_history_title")}</h3>
        {history.length === 0 ? (
          <p className="text-sm text-sage-600">{t("case_detail.p1.gc_history_empty")}</p>
        ) : (
          <ul className="space-y-1 text-sm text-sage-700">
            {history.map((h) => (
              <li key={h.id}>
                {fmt(h.created_at)} · {h.from_surrogate_mother ?? "—"} → {h.to_surrogate_mother ?? "—"}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-sage-800">{t("case_detail.p1.messages_title")}</h3>
        <div className="mb-3 max-h-48 space-y-2 overflow-y-auto rounded-md border border-sage-200 bg-white p-3 text-sm">
          {messages.length === 0 ? (
            <p className="text-sage-600">{t("case_detail.p1.messages_empty")}</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="border-b border-sage-100 pb-2 last:border-0">
                <p className="text-xs text-sage-500">
                  {m.author_role} · {m.author_label ?? "—"} · {fmt(m.created_at)}
                </p>
                <p className="whitespace-pre-wrap text-sage-900">{m.body}</p>
              </div>
            ))
          )}
        </div>
        <textarea
          className="mb-2 w-full rounded-md border border-sage-300 px-3 py-2 text-sm"
          rows={3}
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          disabled={busy}
          placeholder={t("case_detail.p1.message_ph")}
        />
        <label className="mb-2 flex items-center gap-2 text-xs text-sage-700">
          <input
            type="checkbox"
            checked={emailNotify}
            onChange={(e) => setEmailNotify(e.target.checked)}
            disabled={busy}
          />
          {t("case_detail.p1.email_notify")}
        </label>
        <button
          type="button"
          disabled={busy || !messageBody.trim()}
          onClick={() => void sendMessage()}
          className="rounded-md bg-sage-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("case_detail.p1.send_message")}
        </button>
      </div>
    </section>
  );
}
