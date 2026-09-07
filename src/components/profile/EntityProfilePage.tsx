"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListBackLink } from "@/components/ui/ListBackLink";

import type { AdminEntityProfileDetail } from "@/lib/admin/entity-profile";
import type { EntityKind } from "@/lib/admin/entity-profile";
import { GC_PROFILE_PHOTO_KEYS } from "@/lib/profile/gc-photos";
import { BIRTH_HISTORY_ENTRIES_KEY, readBirthHistoryEntries } from "@/lib/profile/birth-history";
import { buildProfileFormValues } from "@/lib/profile/profile-form";
import { BirthHistoryEditor } from "@/components/profile/BirthHistoryEditor";
import { ProfileFieldControl } from "@/components/profile/ProfileFieldControl";
import { ProfilePhotosView } from "@/components/profile/ProfilePhotosView";

function formFromDetail(kind: EntityKind, detail: AdminEntityProfileDetail) {
  const form = buildProfileFormValues(
    detail.sections,
    [detail.profile_data],
    kind === "surrogate_mother" ? GC_PROFILE_PHOTO_KEYS : [],
  );
  if (kind === "surrogate_mother") {
    form[BIRTH_HISTORY_ENTRIES_KEY] = JSON.stringify(readBirthHistoryEntries(detail.profile_data));
  }
  return form;
}

export function EntityProfilePage({
  kind,
  entityId,
  apiBasePath,
  backHref,
  i18nPrefix,
}: {
  kind: EntityKind;
  entityId: string;
  /** e.g. `/api/admin/accounts` or `/api/case-manager/parties` */
  apiBasePath: string;
  backHref: string;
  /** `admin_entity` or `cm_entity` */
  i18nPrefix: "admin_entity" | "cm_entity";
}) {
  const { t } = useTranslation("portal");
  const { t: tCommon } = useTranslation("common");
  const { i18n } = useTranslation();

  const [detail, setDetail] = useState<AdminEntityProfileDetail | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const apiUrl = `${apiBasePath}/${kind}/${encodeURIComponent(entityId)}`;

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(apiUrl);
      if (res.status === 404) {
        setDetail(null);
        setMessage({ type: "err", text: t(`${i18nPrefix}.error_not_found`) });
        return;
      }
      if (!res.ok) throw new Error("load");
      const json = (await res.json()) as AdminEntityProfileDetail;
      setDetail(json);
      setEmail(json.email ?? "");
      setForm(formFromDetail(kind, json));
    } catch {
      setMessage({ type: "err", text: t(`${i18nPrefix}.error_load`) });
    } finally {
      setLoading(false);
    }
  }, [apiUrl, i18nPrefix, kind, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, profileFields: form }),
      });
      if (!res.ok) throw new Error("save");
      const json = (await res.json()) as { detail?: AdminEntityProfileDetail };
      if (json.detail) {
        setDetail(json.detail);
        setForm(formFromDetail(kind, json.detail));
        setEmail(json.detail.email ?? "");
      }
      setMessage({ type: "ok", text: t(`${i18nPrefix}.saved`) });
    } catch {
      setMessage({ type: "err", text: t(`${i18nPrefix}.error_save`) });
    } finally {
      setSaving(false);
    }
  }

  const lng = i18n.language;
  const zh = lng.toLowerCase().startsWith("zh");

  return (
    <div className="ami-ui crm-font-ui crm-page">
      <div className="flex flex-wrap items-start gap-4">
        <ListBackLink fallbackHref={backHref}>{t(`${i18nPrefix}.back`)}</ListBackLink>
        <div className="min-w-0 flex-1">
          <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">
            {t(`${i18nPrefix}.title_${kind}`)}
          </h1>
          <p className="mt-1 text-sm text-sage-700">
            {t(`${i18nPrefix}.subtitle`, { id: entityId, name: detail?.displayName || "—" })}
          </p>
        </div>
      </div>

      {loading ? <p className="text-sm text-sage-600">{tCommon("loading")}</p> : null}

      {message ? (
        <p className={`text-sm ${message.type === "ok" ? "text-green-800" : "text-red-700"}`}>{message.text}</p>
      ) : null}

      {!loading && detail ? (
        <form onSubmit={(e) => void handleSave(e)} className="crm-page">
          <section className="crm-card">
            <h2 className="crm-font-display mb-4 text-lg font-semibold text-brand-brown">
              {t(`${i18nPrefix}.section_account`)}
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                  {t(`${i18nPrefix}.field_entity_id`)}
                </dt>
                <dd className="mt-1 font-medium">{detail.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                  {t(`${i18nPrefix}.field_login_user`)}
                </dt>
                <dd className="mt-1 break-all">{detail.userEmail ?? "—"}</dd>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                  {t(`${i18nPrefix}.field_entity_email`)}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </dl>
          </section>

          {detail.sections.map((section) => (
            <section
              key={section.id}
              className="crm-card"
            >
              <h2 className="crm-font-display mb-4 text-lg font-semibold text-brand-brown">
                {zh ? section.titleZh : section.titleEn}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.id === "birth_history" ? (
                  <BirthHistoryEditor
                    entries={readBirthHistoryEntries({
                      [BIRTH_HISTORY_ENTRIES_KEY]: (() => {
                        try {
                          return JSON.parse(form[BIRTH_HISTORY_ENTRIES_KEY] || "[]");
                        } catch {
                          return [];
                        }
                      })(),
                    })}
                    onChange={(entries) =>
                      setForm((prev) => ({
                        ...prev,
                        [BIRTH_HISTORY_ENTRIES_KEY]: JSON.stringify(entries),
                      }))
                    }
                    zh={zh}
                    disabled={saving}
                  />
                ) : null}
                {section.fields.map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-semibold text-sage-700">
                      {zh ? field.labelZh : field.labelEn}
                    </label>
                    <ProfileFieldControl
                      field={field}
                      value={form[field.key] ?? ""}
                      onChange={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
                      zh={zh}
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}

          {kind === "surrogate_mother" ? (
            <section className="crm-card">
              <ProfilePhotosView
                profileData={detail.profile_data}
                className=""
                emptyMessage={t("profile_photos.empty")}
              />
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="crm-btn crm-btn-primary"
            >
              {saving ? t(`${i18nPrefix}.saving`) : t(`${i18nPrefix}.save`)}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void load()}
              className="rounded-md border border-sage-400 bg-white px-5 py-2.5 text-sm font-semibold text-sage-800 hover:bg-sage-50"
            >
              {t(`${i18nPrefix}.reset`)}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
