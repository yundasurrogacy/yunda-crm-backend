"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  buildCrmAmObjectKey,
  fetchQiniuUploadToken,
  uploadFileQiniuFormDirect,
} from "@/lib/qiniu/direct-upload-browser";

type Props = {
  inputId: string;
  caseId: string;
  value: string[];
  onChange: (urls: string[]) => void;
  disabled: boolean;
};

/** 多文件上传：一次可选多个文件，逐个直传七牛后追加为 URL 列表；也可手动粘贴链接。 */
export function AmQiniuFileMultiInput({ inputId, caseId, value, onChange, disabled }: Props) {
  const { t } = useTranslation("portal");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  // 手动粘贴区：本地保留原始文本（含空行），仅在数组被外部改变时才回灌，避免 Enter 被吃掉。
  const joined = value.join("\n");
  const [manual, setManual] = useState(joined);
  const lastEmitted = useRef(joined);
  useEffect(() => {
    if (joined !== lastEmitted.current) {
      lastEmitted.current = joined;
      setManual(joined);
    }
  }, [joined]);

  const onManualChange = (text: string) => {
    setManual(text);
    const urls = text
      .split(/\r?\n/u)
      .map((s) => s.trim())
      .filter(Boolean);
    lastEmitted.current = urls.join("\n");
    onChange(urls);
  };

  const onPick = () => {
    setLocalError(null);
    fileRef.current?.click();
  };

  const removeUrl = (url: string) => onChange(value.filter((u) => u !== url));

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || disabled) return;
    setLocalError(null);
    setUploading(true);
    setProgress(0);
    const added: string[] = [];
    try {
      const cfg = await fetchQiniuUploadToken();
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]!;
        const key = buildCrmAmObjectKey(cfg.dirPath, caseId, file.name);
        const url = await uploadFileQiniuFormDirect({
          file,
          token: cfg.token,
          uploadUrl: cfg.uploadUrl,
          baseUrl: cfg.baseUrl,
          key,
          onProgress: (pct) => setProgress(Math.round(((i + pct / 100) / files.length) * 100)),
        });
        added.push(url);
      }
      if (added.length) onChange([...value, ...added]);
    } catch (err) {
      if (added.length) onChange([...value, ...added]);
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
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        multiple
        className="sr-only"
        accept="*/*"
        onChange={onFiles}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onPick}
          className="ami-ui rounded-md border border-sage-400 bg-white px-3 py-1.5 text-xs font-semibold text-sage-900 shadow-sm hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading
            ? t("case_detail.am_workspace.upload_uploading", { pct: progress })
            : t("case_detail.trust.voucher_pick")}
        </button>
        {value.length > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onChange([])}
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

      {value.length > 0 ? (
        <ul className="space-y-1">
          {value.map((url) => (
            <li key={url} className="flex items-center gap-2 text-xs">
              <a
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-w-0 items-center gap-1 font-semibold text-sage-700 underline underline-offset-2 hover:text-brand-brown"
              >
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden strokeWidth={2} />
                <span className="truncate">{url}</span>
              </a>
              <button
                type="button"
                disabled={busy}
                onClick={() => removeUrl(url)}
                className="shrink-0 font-semibold text-red-700 underline underline-offset-2 hover:text-red-900 disabled:opacity-50"
              >
                {t("case_detail.trust.voucher_remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="block text-[11px] text-sage-500">
        {t("case_detail.trust.voucher_manual")}
        <textarea
          rows={2}
          className="mt-1 block w-full rounded-md border border-sage-300 bg-white px-2 py-1.5 text-xs text-sage-900"
          value={manual}
          onChange={(e) => onManualChange(e.target.value)}
          placeholder={t("case_detail.trust.voucher_manual_ph")}
          disabled={busy}
        />
      </label>
    </div>
  );
}
