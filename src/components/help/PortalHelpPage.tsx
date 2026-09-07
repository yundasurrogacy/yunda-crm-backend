"use client";

import { helpDocForPath, helpShotSrc, type PortalHelpDoc } from "@/lib/help/portal-help";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function PortalHelpPage({ doc }: { doc?: PortalHelpDoc }) {
  const pathname = usePathname() ?? "";
  const { t, i18n } = useTranslation("portal");
  const data = doc ?? helpDocForPath(pathname);
  const [preview, setPreview] = useState<{ image: string; alt: string } | null>(null);
  const previewTitleId = useId();

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPreview(null);
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [preview]);

  return (
    <div className="ami-ui crm-font-ui crm-page">
      <div>
        <h1 className="crm-font-display text-2xl font-semibold text-brand-brown">{t(data.titleKey)}</h1>
        <p className="mt-1 text-sm text-sage-700">{t(data.subtitleKey)}</p>
        <p className="mt-2 text-xs leading-relaxed text-sage-600">{t("help.screenshot_note")}</p>
      </div>

      {data.sections.length > 1 || (data.faqs && data.faqs.length) ? (
        <nav className="crm-card" aria-label={t("help.on_this_page")}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage-600">{t("help.on_this_page")}</p>
          <ol className="flex flex-wrap gap-2 text-sm">
            {data.sections.map((section, i) => (
              <li key={section.id}>
                <a
                  href={`#help-${section.id}`}
                  className="inline-flex rounded-full border border-sage-200 bg-white px-3 py-1 text-sage-800 hover:border-brand-brown/40 hover:text-brand-brown"
                >
                  {i + 1}. {t(section.titleKey)}
                </a>
              </li>
            ))}
            {data.faqs?.length ? (
              <li>
                <a
                  href="#help-faq"
                  className="inline-flex rounded-full border border-sage-200 bg-white px-3 py-1 text-sage-800 hover:border-brand-brown/40 hover:text-brand-brown"
                >
                  {t("help.faq")}
                </a>
              </li>
            ) : null}
          </ol>
        </nav>
      ) : null}

      {data.sections.map((section) => (
        <section key={section.id} id={`help-${section.id}`} className="crm-card scroll-mt-4">
          <h2 className="crm-font-display mb-2 text-lg font-semibold text-brand-brown">{t(section.titleKey)}</h2>
          {section.introKey ? <p className="mb-3 text-sm text-sage-700">{t(section.introKey)}</p> : null}
          <ol className="space-y-4">
            {section.steps.map((step, i) => {
              const src = step.image ? helpShotSrc(step.image, i18n.language) : null;
              const alt = t(step.titleKey);
              return (
                <li key={step.titleKey} className="rounded-lg border border-sage-200/80 bg-white/70 p-4">
                  <p className="text-sm font-semibold text-sage-900">
                    <span className="mr-2 tabular-nums text-brand-brown">{i + 1}.</span>
                    {alt}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-sage-700">{t(step.bodyKey)}</p>
                  {src ? (
                    <button
                      type="button"
                      onClick={() => setPreview({ image: step.image!, alt })}
                      className="group relative mt-3 block w-full cursor-zoom-in rounded-md border border-sage-200 bg-sage-50 text-left transition hover:border-brand-brown/40 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-brown/30"
                      aria-label={`${t("help.open_image")} — ${alt}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={alt}
                        key={src}
                        className="max-h-[22rem] w-full object-contain"
                      />
                      <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-[color:color-mix(in_srgb,var(--bark)_78%,transparent)] px-2 py-1 text-[11px] font-semibold text-petal opacity-90 group-hover:opacity-100">
                        {t("help.open_image")}
                      </span>
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      {data.faqs?.length ? (
        <section id="help-faq" className="crm-card scroll-mt-4">
          <h2 className="crm-font-display mb-3 text-lg font-semibold text-brand-brown">{t("help.faq")}</h2>
          <dl className="space-y-3">
            {data.faqs.map((faq) => (
              <div key={faq.qKey} className="rounded-lg border border-sage-200/80 bg-white/70 p-4">
                <dt className="text-sm font-semibold text-sage-900">{t(faq.qKey)}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-sage-700">{t(faq.aKey)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {preview ? (
        <OverlayPortal>
          <div
            className="crm-dialog-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-[color:color-mix(in_srgb,var(--bark)_62%,transparent)] p-3 sm:p-6"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setPreview(null);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={previewTitleId}
              className="relative flex max-h-[96vh] w-full max-w-[92vw] flex-col"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p id={previewTitleId} className="min-w-0 truncate text-sm font-semibold text-petal">
                  {t("help.image_preview")} · {preview.alt}
                </p>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="crm-btn crm-btn-secondary crm-btn-sm shrink-0 bg-petal"
                  autoFocus
                >
                  {t("help.close_preview")}
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={helpShotSrc(preview.image, i18n.language)}
                alt={preview.alt}
                className="max-h-[88vh] w-full rounded-lg border border-white/40 bg-petal object-contain shadow-[0_24px_48px_rgba(60,36,21,0.28)]"
              />
            </div>
          </div>
        </OverlayPortal>
      ) : null}
    </div>
  );
}
