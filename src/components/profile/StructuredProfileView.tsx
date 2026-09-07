"use client";

import { useMemo } from "react";
import { CHILD_SEX, DELIVERY_METHOD, type ProfileSectionDef } from "@/constants/gc-profile-schema";
import { flattenProfileSources, resolveProfileSection } from "@/lib/profile/display-profile";
import { readBirthHistoryEntries } from "@/lib/profile/birth-history";

export function StructuredProfileView({
  sections,
  sources,
  lng,
  emptyMessage,
}: {
  sections: ProfileSectionDef[];
  sources: unknown[];
  lng: string;
  emptyMessage?: string;
}) {
  const flat = useMemo(() => flattenProfileSources(...sources), [sources]);

  const birthEntries = useMemo(() => readBirthHistoryEntries(sources[0]), [sources]);
  const zh = lng.toLowerCase().startsWith("zh");

  const resolved = useMemo(
    () => sections.map((s) => resolveProfileSection(s, flat, lng)),
    [sections, flat, lng],
  );

  const hasAnyValue = useMemo(
    () =>
      birthEntries.length > 0 ||
      resolved.some((s) => s.rows.some((r) => r.value !== "—")),
    [resolved, birthEntries.length],
  );

  if (!hasAnyValue && emptyMessage) {
    return <p className="text-sm text-sage-600">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-5">
      {resolved.map((section, idx) => (
        <div key={sections[idx]?.id ?? section.title} className="rounded-lg border border-sage-200/70 bg-white/40 p-3 md:p-4">
          <h3 className="crm-font-display mb-3 text-sm font-semibold text-brand-brown">{section.title}</h3>
          {sections[idx]?.id === "birth_history" && birthEntries.length > 0 ? (
            <ol className="mb-3 space-y-2 text-sm">
              {birthEntries
                .filter((entry) =>
                  [entry.delivery_date, entry.gestational_weeks, entry.weight, entry.child_sex, entry.delivery_method].some(
                    Boolean,
                  ),
                )
                .map((entry, i) => {
                const sex =
                  CHILD_SEX.find((o) => o.value === entry.child_sex)?.[zh ? "labelZh" : "labelEn"] ||
                  entry.child_sex;
                const method =
                  DELIVERY_METHOD.find((o) => o.value === entry.delivery_method)?.[
                    zh ? "labelZh" : "labelEn"
                  ] || entry.delivery_method;
                return (
                  <li key={i} className="rounded-md bg-sage-50/80 px-3 py-2 text-sage-900">
                    {zh ? `第 ${i + 1} 次` : `Birth ${i + 1}`}:{" "}
                    {[entry.delivery_date, entry.gestational_weeks && `${entry.gestational_weeks}${zh ? " 周" : " w"}`, entry.weight, sex, method]
                      .filter(Boolean)
                      .join(" · ")}
                  </li>
                );
              })}
            </ol>
          ) : null}
          <dl className="grid gap-2.5 sm:grid-cols-2">
            {section.rows.map((row) => (
              <div key={row.key} className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-sage-600">{row.label}</dt>
                <dd className="mt-0.5 text-sm leading-snug text-sage-900 break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
