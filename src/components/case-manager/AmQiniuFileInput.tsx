"use client";

import { ExternalLink } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  buildCrmAmObjectKey,
  fetchQiniuUploadToken,
  uploadFileQiniuFormDirect,
} from "@/lib/qiniu/direct-upload-browser";

function inputClass(disabled: boolean) {
  return [
    "crm-font-ui block w-full rounded-md border border-sage-300/90 bg-white px-3 py-2 text-sm text-sage-900 shadow-sm",
    "placeholder:text-sage-400 focus:border-brand-brown focus:outline-none focus:ring-1 focus:ring-brand-brown",
    disabled ? "cursor-not-allowed bg-sage-100/80 opacity-80" : "",
  ].join(" ");
}

type Props = {
  inputId: string;
  caseId: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
};

export function AmQiniuFileInput({ inputId, caseId, value, onChange, disabled }: Props) {
  const { t } = useTranslation("portal");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const onPick = () => {
    setLocalError(null);
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled) return;
    setLocalError(null);
    setUploading(true);
    setProgress(0);
    try {
      const cfg = await fetchQiniuUploadToken();
      const key = buildCrmAmObjectKey(cfg.dirPath, caseId, file.name);
      const url = await uploadFileQiniuFormDirect({
        file,
        token: cfg.token,
        uploadUrl: cfg.uploadUrl,
        baseUrl: cfg.baseUrl,
        key,
        onProgress: setProgress,
      });
      onChange(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "UNAUTHORIZED") setLocalError(t("case_detail.am_workspace.upload_unauthorized"));
      else setLocalError(t("case_detail.am_workspace.upload_error"));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const busy = disabled || uploading;

  return (
    <div className="space-y-2">
      <input ref={fileRef} type="file" className="sr-only" accept="*/*" onChange={onFile} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onPick}
          className="ami-ui rounded-md border border-sage-400 bg-white px-3 py-1.5 text-xs font-semibold text-sage-900 shadow-sm hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? t("case_detail.am_workspace.upload_uploading", { pct: progress }) : t("case_detail.am_workspace.upload_pick")}
        </button>
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-xs font-semibold text-sage-700 underline underline-offset-2 hover:text-brand-brown"
          >
            <ExternalLink className="h-3 w-3" aria-hidden strokeWidth={2} />
            {t("case_detail.am_workspace.open_file_url")}
          </a>
        ) : null}
        {value ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onChange("")}
            className="text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900 disabled:opacity-50"
          >
            {t("case_detail.am_workspace.clear_file")}
          </button>
        ) : null}
      </div>
      {uploading ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-sage-200">
          <div className="h-full bg-brand-brown transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {localError ? <p className="text-xs text-red-700">{localError}</p> : null}
      <input
        id={inputId}
        type="url"
        autoComplete="off"
        disabled={busy}
        className={inputClass(busy)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("case_detail.am_workspace.url_placeholder")}
      />
      <p className="text-[11px] text-sage-500">{t("case_detail.am_workspace.url_hint")}</p>
    </div>
  );
}
