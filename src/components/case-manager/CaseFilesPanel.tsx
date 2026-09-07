"use client";

import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AmQiniuFileInput } from "@/components/case-manager/AmQiniuFileInput";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { SelectMenu } from "@/components/ui/SelectMenu";
import {
  CASE_FILE_CATEGORIES,
  type CaseFileRow,
} from "@/lib/case-manager/case-files";

type Props = {
  caseId: string;
  apiPathBase: string;
};

/** 体检/移植/OB 照片、产检报告、Escrow/Legal 合同：默认对客可见 */
const DEFAULT_CLIENT_VISIBLE = new Set([
  "Photo",
  "PrenatalReport",
  "EscrowLegalContract",
]);

function formatDt(iso: string, lng: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return lng.toLowerCase().startsWith("zh")
      ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(d)
      : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
  } catch {
    return iso;
  }
}

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp|bmp|heic)(\?|#|$)/i.test(url);
}

export function CaseFilesPanel({ caseId, apiPathBase }: Props) {
  const { t, i18n } = useTranslation("portal");
  const confirm = useConfirm();
  const [files, setFiles] = useState<CaseFileRow[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [category, setCategory] = useState("Other");
  const [aboutRole, setAboutRole] = useState("");
  /** 默认客户可见；内部材料可手动改为仅经理 */
  const [visibility, setVisibility] = useState<"all" | "manager">("all");
  const [note, setNote] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  const filesApi = `${apiPathBase}/${encodeURIComponent(caseId)}/files`;

  const categoryLabel = (cat: string) =>
    t(`case_detail.files.category_${cat}`, { defaultValue: cat });

  const onCategoryChange = (next: string) => {
    setCategory(next);
    if (DEFAULT_CLIENT_VISIBLE.has(next)) {
      setVisibility("all");
    }
  };

  const reload = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      const res = await fetch(filesApi);
      if (!res.ok) {
        setErrorKey("case_detail.files.error_load");
        return;
      }
      const json = (await res.json()) as { files?: CaseFileRow[] };
      setFiles(json.files ?? []);
    } catch {
      setErrorKey("case_detail.files.error_load");
    } finally {
      setLoading(false);
    }
  }, [filesApi]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onSubmit = async () => {
    if (saving || !fileUrl.trim()) {
      setErrorKey("case_detail.files.error_url");
      return;
    }
    setSaving(true);
    setErrorKey(null);
    try {
      const res = await fetch(filesApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          file_url: fileUrl.trim(),
          about_role: aboutRole || null,
          note,
          visibility,
        }),
      });
      const json = (await res.json().catch(() => null)) as { files?: CaseFileRow[] } | null;
      if (!res.ok) {
        setErrorKey("case_detail.files.error_save");
        return;
      }
      setFiles(json?.files ?? []);
      setFileUrl("");
      setNote("");
    } catch {
      setErrorKey("case_detail.files.error_save");
    } finally {
      setSaving(false);
    }
  };

  async function onDelete(fileId: string) {
    const ok = await confirm({
      message: t("case_detail.files.confirm_delete"),
      danger: true,
    });
    if (!ok) return;
    setDeletingId(fileId);
    setErrorKey(null);
    try {
      const res = await fetch(filesApi, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      const json = (await res.json().catch(() => null)) as { files?: CaseFileRow[] } | null;
      if (!res.ok) {
        setErrorKey("case_detail.files.error_delete");
        return;
      }
      setFiles(json?.files ?? []);
    } catch {
      setErrorKey("case_detail.files.error_delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <CollapsibleCard
      title={t("case_detail.files.section_title")}
      summary={t("case_detail.files.summary_count", { count: files.length })}
      storageKey={`crm-case-detail-files-${caseId}`}
      defaultOpen={false}
    >
      <p className="mb-4 text-sm text-sage-700">{t("case_detail.files.section_intro")}</p>
      {errorKey ? <p className="mb-3 text-sm text-red-700">{t(errorKey)}</p> : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-sage-600">
          {t("case_detail.files.field_category")}
          <div className="mt-1">
            <SelectMenu
              value={category}
              onChange={onCategoryChange}
              disabled={saving}
              options={CASE_FILE_CATEGORIES.map((c) => ({
                value: c,
                label: categoryLabel(c),
              }))}
            />
          </div>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-sage-600">
          {t("case_detail.files.field_visibility")}
          <div className="mt-1">
            <SelectMenu
              value={visibility}
              onChange={(v) => setVisibility(v as "all" | "manager")}
              disabled={saving}
              options={[
                { value: "manager", label: t("case_detail.files.visibility_manager") },
                { value: "all", label: t("case_detail.files.visibility_all") },
              ]}
            />
          </div>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-sage-600">
          {t("case_detail.files.field_about")}
          <div className="mt-1">
            <SelectMenu
              value={aboutRole}
              onChange={setAboutRole}
              disabled={saving}
              options={[
                { value: "", label: t("case_detail.files.about_none") },
                { value: "intended_parent", label: t("case_detail.role_intended_parent") },
                { value: "surrogate_mother", label: t("case_detail.role_surrogate") },
              ]}
            />
          </div>
        </label>
        <div className="sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage-600">
            {t("case_detail.files.field_file")}
          </p>
          <AmQiniuFileInput
            inputId={`case-file-${caseId}`}
            caseId={caseId}
            value={fileUrl}
            onChange={setFileUrl}
            disabled={saving}
          />
          {category === "Photo" ? (
            <p className="mt-1 text-xs text-sage-600">{t("case_detail.files.photo_hint")}</p>
          ) : null}
        </div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-sage-600 sm:col-span-2">
          {t("case_detail.files.field_note")}
          <input
            type="text"
            className="mt-1 block w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={saving}
            placeholder={
              category === "Photo"
                ? t("case_detail.files.photo_note_ph")
                : category === "EscrowLegalContract"
                  ? t("case_detail.files.contract_note_ph")
                  : undefined
            }
          />
        </label>
      </div>

      <button
        type="button"
        disabled={saving || !fileUrl.trim()}
        onClick={() => void onSubmit()}
        className="ami-ui mb-6 rounded-md border border-brand-brown bg-brand-brown px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? t("case_detail.files.saving") : t("case_detail.files.submit")}
      </button>

      {loading ? (
        <p className="text-sm text-sage-600">{t("case_detail.files.loading")}</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-sage-600">{t("case_detail.empty_files")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-sage-200 text-xs uppercase tracking-wide text-sage-600">
              <tr>
                <th className="py-2 pr-3 font-semibold">{t("case_detail.col_category")}</th>
                <th className="py-2 pr-3 font-semibold">{t("case_detail.files.field_visibility")}</th>
                <th className="py-2 pr-3 font-semibold">{t("case_detail.files.field_about")}</th>
                <th className="py-2 pr-3 font-semibold">{t("case_detail.col_link")}</th>
                <th className="py-2 pr-3 font-semibold">{t("case_detail.col_note")}</th>
                <th className="py-2 pr-3 font-semibold">{t("case_detail.col_updated")}</th>
                <th className="py-2 font-semibold">{t("case_detail.files.col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-b border-sage-100 align-top">
                  <td className="py-2 pr-3">{categoryLabel(f.category)}</td>
                  <td className="py-2 pr-3">
                    {(f.visibility || "manager") === "all"
                      ? t("case_detail.files.visibility_all")
                      : t("case_detail.files.visibility_manager")}
                  </td>
                  <td className="py-2 pr-3">
                    {f.about_role === "intended_parent"
                      ? t("case_detail.role_intended_parent")
                      : f.about_role === "surrogate_mother"
                        ? t("case_detail.role_surrogate")
                        : t("case_detail.files.about_none")}
                  </td>
                  <td className="py-2 pr-3">
                    {f.file_url ? (
                      <div className="flex flex-col gap-1">
                        {isImageUrl(f.file_url) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={f.file_url}
                            alt=""
                            className="h-16 w-16 rounded object-cover border border-sage-200"
                          />
                        ) : null}
                        <a
                          href={f.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-brand-brown hover:underline"
                        >
                          {t("case_detail.open_file")}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-3">{f.note || "—"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-sage-700">
                    {formatDt(f.created_at, i18n.language)}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      disabled={deletingId === f.id}
                      onClick={() => void onDelete(f.id)}
                      className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingId === f.id
                        ? t("case_detail.files.deleting")
                        : t("case_detail.files.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CollapsibleCard>
  );
}
