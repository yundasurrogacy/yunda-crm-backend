"use client";

import { helpDocForPath, type PortalHelpDoc } from "@/lib/help/portal-help";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

export function PortalHelpPage({ doc }: { doc?: PortalHelpDoc }) {
  const pathname = usePathname() ?? "";
  const { t } = useTranslation("portal");
  const data = doc ?? helpDocForPath(pathname);

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
            {section.steps.map((step, i) => (
              <li key={step.titleKey} className="rounded-lg border border-sage-200/80 bg-white/70 p-4">
                <p className="text-sm font-semibold text-sage-900">
                  <span className="mr-2 tabular-nums text-brand-brown">{i + 1}.</span>
                  {t(step.titleKey)}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-sage-700">{t(step.bodyKey)}</p>
                {step.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={step.image}
                    alt={t(step.titleKey)}
                    className="mt-3 max-h-[22rem] w-full rounded-md border border-sage-200 object-contain bg-sage-50"
                  />
                ) : null}
              </li>
            ))}
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
    </div>
  );
}
