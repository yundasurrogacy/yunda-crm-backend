"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { AdminEntityProfileDetail } from "@/lib/admin/entity-profile";
import type { EntityKind } from "@/lib/admin/entity-profile";
import { buildProfileFormValues } from "@/lib/profile/profile-form";

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
      setForm(buildProfileFormValues(json.sections, [json.profile_data]));
    } catch {
      setMessage({ type: "err", text: t(`${i18nPrefix}.error_load`) });
    } finally {
      setLoading(false);
    }
  }, [apiUrl, i18nPrefix, t]);

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
        setForm(buildProfileFormValues(json.detail.sections, [json.detail.profile_data]));
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
    <div className="ami-ui crm-font-ui space-y-6 text-sage-900">
      <div className="flex flex-wrap items-start gap-4">
        <Link
          href={backHref}
          className="ami-ui inline-flex items-center gap-1.5 rounded-md border border-sage-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-sage-800 shadow-sm hover:bg-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
          {t(`${i18nPrefix}.back`)}
        </Link>
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
        <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
          <section className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6">
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
              className="rounded-xl border border-sage-200/80 bg-white/50 p-4 shadow-sm md:p-6"
            >
              <h2 className="crm-font-display mb-4 text-lg font-semibold text-brand-brown">
                {zh ? section.titleZh : section.titleEn}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-semibold text-sage-700">
                      {zh ? field.labelZh : field.labelEn}
                    </label>
                    <input
                      type="text"
                      value={form[field.key] ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className="mt-1 w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-brand-brown px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
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
