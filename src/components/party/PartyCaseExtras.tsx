"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CaseFileRow } from "@/lib/case-manager/case-files";
import type { CaseMessageRow } from "@/lib/case-manager/case-messages";

export function PartyCaseExtras({
  caseId,
  apiBase,
  canPostMessages,
}: {
  caseId: string;
  apiBase: string;
  canPostMessages: boolean;
}) {
  const { t, i18n } = useTranslation("portal");
  const [files, setFiles] = useState<CaseFileRow[]>([]);
  const [messages, setMessages] = useState<CaseMessageRow[]>([]);
  const [body, setBody] = useState("");
  const [emailNotify, setEmailNotify] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [fRes, mRes] = await Promise.all([
        fetch(`${apiBase}/${encodeURIComponent(caseId)}/files`),
        canPostMessages
          ? fetch(`${apiBase}/${encodeURIComponent(caseId)}/messages`)
          : Promise.resolve(null),
      ]);
      if (fRes.ok) {
        const json = (await fRes.json()) as { files?: CaseFileRow[] };
        setFiles(json.files ?? []);
      }
      if (mRes?.ok) {
        const json = (await mRes.json()) as { messages?: CaseMessageRow[] };
        setMessages(json.messages ?? []);
      }
    } catch {
      /* ignore */
    }
  }, [apiBase, canPostMessages, caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    if (!canPostMessages || !body.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/${encodeURIComponent(caseId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, email_notify: emailNotify }),
      });
      const json = (await res.json().catch(() => ({}))) as { messages?: CaseMessageRow[] };
      if (res.ok) {
        setMessages(json.messages ?? []);
        setBody("");
      }
    } finally {
      setBusy(false);
    }
  }

  const fmt = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(
        i18n.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US",
        { dateStyle: "medium", timeStyle: "short" },
      ).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const categoryLabel = (cat: string) =>
    t(`case_detail.files.category_${cat}`, { defaultValue: cat });

  const isImageUrl = (url: string) =>
    /\.(jpe?g|png|gif|webp|bmp|heic)(\?|#|$)/i.test(url);

  return (
    <div className="crm-page">
      <section className="crm-card">
        <h2 className="crm-font-display mb-2 text-lg font-semibold text-brand-brown">
          {t("party_cases.section_files")}
        </h2>
        <p className="mb-3 text-sm text-sage-700">{t("party_cases.files_intro")}</p>
        {files.length === 0 ? (
          <p className="text-sm text-sage-600">{t("party_cases.files_empty")}</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-start gap-3 border-b border-sage-100 pb-3 last:border-0 last:pb-0"
              >
                {f.file_url && isImageUrl(f.file_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={f.file_url} target="_blank" rel="noreferrer">
                    <img
                      src={f.file_url}
                      alt=""
                      className="h-20 w-20 rounded border border-sage-200 object-cover"
                    />
                  </a>
                ) : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium text-sage-900">{categoryLabel(f.category)}</p>
                  {f.note ? <p className="text-sage-700">{f.note}</p> : null}
                  <div className="flex flex-wrap items-center gap-2">
                    {f.file_url ? (
                      <a
                        href={f.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-brown underline"
                      >
                        {t("case_detail.open_file")}
                      </a>
                    ) : null}
                    <span className="text-xs text-sage-500">{fmt(f.created_at)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canPostMessages ? (
        <section className="crm-card">
          <h2 className="crm-font-display mb-2 text-lg font-semibold text-brand-brown">
            {t("party_cases.section_messages")}
          </h2>
          <div className="mb-3 max-h-48 space-y-2 overflow-y-auto rounded-md border border-sage-200 bg-white p-3 text-sm">
            {messages.length === 0 ? (
              <p className="text-sage-600">{t("party_cases.messages_empty")}</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="border-b border-sage-100 pb-2 last:border-0">
                  <p className="text-xs text-sage-500">
                    {m.author_role} · {fmt(m.created_at)}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              ))
            )}
          </div>
          <textarea
            className="mb-2 w-full rounded-md border border-sage-300 px-3 py-2 text-sm"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={busy}
          />
          <label className="mb-2 flex items-center gap-2 text-xs">
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
            disabled={busy || !body.trim()}
            onClick={() => void send()}
            className="crm-btn crm-btn-primary crm-btn-sm"
          >
            {t("case_detail.p1.send_message")}
          </button>
        </section>
      ) : null}
    </div>
  );
}
