"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminEntityProfileDetail } from "@/lib/admin/entity-profile";
import { GC_PROFILE_PHOTO_KEYS, looksLikeImageUrl, parseGcAlbumUrls } from "@/lib/profile/gc-photos";
import { buildProfileFormValues } from "@/lib/profile/profile-form";
import { AmQiniuFileInput } from "@/components/case-manager/AmQiniuFileInput";
import { ProfileFieldControl } from "@/components/profile/ProfileFieldControl";

function joinPhotoUrls(urls: string[]): string {
  return urls.join("\n");
}

function formFromProfileDetail(detail: AdminEntityProfileDetail): Record<string, string> {
  return buildProfileFormValues(detail.sections, [detail.profile_data], GC_PROFILE_PHOTO_KEYS);
}

export function SurrogateSelfProfilePage() {
  const { t, i18n } = useTranslation("portal");
  const [detail, setDetail] = useState<AdminEntityProfileDetail | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [albumUpload, setAlbumUpload] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/surrogate-mother/profile");
      if (!res.ok) {
        setError(t("sm_profile.error_load"));
        return;
      }
      const json = (await res.json()) as AdminEntityProfileDetail;
      setDetail(json);
      setForm(formFromProfileDetail(json));
    } catch {
      setError(t("sm_profile.error_load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 相册直传完成后追加一行 URL */
  useEffect(() => {
    const url = albumUpload.trim();
    if (!url) return;
    setForm((prev) => {
      const existing = parseGcAlbumUrls(prev.photo_urls ?? "");
      if (existing.includes(url)) return prev;
      return { ...prev, photo_urls: joinPhotoUrls([...existing, url]) };
    });
    setAlbumUpload("");
  }, [albumUpload]);

  const avatarUrl = (form.profile_photo_url ?? "").trim();
  const albumUrls = useMemo(() => parseGcAlbumUrls(form.photo_urls ?? ""), [form.photo_urls]);

  function removeAlbumUrl(url: string) {
    setForm((prev) => ({
      ...prev,
      photo_urls: joinPhotoUrls(parseGcAlbumUrls(prev.photo_urls ?? "").filter((u) => u !== url)),
    }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/surrogate-mother/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileFields: form }),
      });
      if (!res.ok) {
        setError(t("sm_profile.error_save"));
        return;
      }
      const json = (await res.json()) as { detail?: AdminEntityProfileDetail };
      if (json.detail) {
        const next: AdminEntityProfileDetail = {
          ...json.detail,
          sections: detail?.sections ?? json.detail.sections,
        };
        setDetail(next);
        setForm(formFromProfileDetail(next));
      }
      setMessage(t("sm_profile.saved"));
    } catch {
      setError(t("sm_profile.error_save"));
    } finally {
      setSaving(false);
    }
  }

  const zh = i18n.language.toLowerCase().startsWith("zh");

  return (
    <div className="ami-ui crm-font-ui crm-page">
      <div>
        <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t("sm_profile.title")}</h1>
        <p className="mt-1 text-sm text-sage-700">{t("sm_profile.intro")}</p>
      </div>
      {loading ? <p className="text-sm text-sage-600">{t("sm_profile.loading")}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      {!loading && detail ? (
        <form onSubmit={onSave} className="crm-page">
          {detail.sections.map((section) => (
            <section
              key={section.id}
              className="crm-card"
            >
              <h2 className="crm-font-display mb-3 text-lg font-semibold text-brand-brown">
                {zh ? section.titleZh : section.titleEn}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {section.fields.map((f) => (
                  <label key={f.key} className="block text-xs font-semibold uppercase tracking-wide text-sage-600">
                    {zh ? f.labelZh : f.labelEn}
                    <ProfileFieldControl
                      field={f}
                      value={form[f.key] ?? ""}
                      onChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                      zh={zh}
                      disabled={saving}
                    />
                  </label>
                ))}
              </div>
            </section>
          ))}

          <section className="crm-card">
            <h2 className="crm-font-display mb-3 text-lg font-semibold text-brand-brown">
              {t("sm_profile.photos")}
            </h2>
            <p className="mb-4 text-sm text-sage-700">{t("sm_profile.photos_intro")}</p>

            <div className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage-600">
                {t("sm_profile.avatar_label")}
              </p>
              {avatarUrl && looksLikeImageUrl(avatarUrl) ? (
                <div className="mb-3 flex flex-wrap items-end gap-3">
                  <a href={avatarUrl} target="_blank" rel="noreferrer" className="block shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-28 w-28 rounded-lg border border-sage-200 object-cover bg-sage-50"
                    />
                  </a>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setForm((prev) => ({ ...prev, profile_photo_url: "" }))}
                    className="rounded-md border border-sage-300 bg-white px-3 py-1.5 text-xs font-semibold text-sage-800 hover:bg-sage-50 disabled:opacity-50"
                  >
                    {t("sm_profile.remove_photo")}
                  </button>
                </div>
              ) : avatarUrl ? (
                <p className="mb-2 break-all text-xs text-sage-600">{avatarUrl}</p>
              ) : (
                <p className="mb-2 text-xs text-sage-500">{t("sm_profile.no_avatar")}</p>
              )}
              <AmQiniuFileInput
                inputId="sm-profile-photo"
                caseId={`sm-${detail.id}`}
                value={form.profile_photo_url ?? ""}
                onChange={(v) => setForm((prev) => ({ ...prev, profile_photo_url: v }))}
                disabled={saving}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage-600">
                {t("sm_profile.photo_urls")}
              </p>
              {albumUrls.length > 0 ? (
                <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {albumUrls.map((url) => (
                    <li key={url} className="relative">
                      {looksLikeImageUrl(url) ? (
                        <a href={url} target="_blank" rel="noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            className="aspect-square w-full rounded-lg border border-sage-200 object-cover bg-sage-50"
                          />
                        </a>
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex aspect-square items-center justify-center rounded-lg border border-sage-200 bg-sage-50 p-2 text-center text-xs text-brand-brown underline break-all"
                        >
                          {t("sm_profile.open_link")}
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => removeAlbumUrl(url)}
                        className="absolute right-1.5 top-1.5 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-sage-800 shadow-sm ring-1 ring-sage-300 hover:bg-white disabled:opacity-50"
                      >
                        {t("sm_profile.remove_photo")}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-2 text-xs text-sage-500">{t("sm_profile.no_album")}</p>
              )}
              <p className="mb-2 text-xs text-sage-600">{t("sm_profile.album_upload_hint")}</p>
              <AmQiniuFileInput
                inputId="sm-profile-album"
                caseId={`sm-${detail.id}-album`}
                value={albumUpload}
                onChange={setAlbumUpload}
                disabled={saving}
              />
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-sage-600">
                {t("sm_profile.photo_urls_edit")}
                <textarea
                  className="mt-1 block w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm font-normal normal-case"
                  rows={3}
                  value={form.photo_urls ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, photo_urls: e.target.value }))}
                  disabled={saving}
                  placeholder={t("sm_profile.photo_urls_ph")}
                />
              </label>
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-brown px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? t("sm_profile.saving") : t("sm_profile.save")}
          </button>
        </form>
      ) : null}
    </div>
  );
}
