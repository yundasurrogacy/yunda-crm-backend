"use client";

import { useMemo } from "react";
import type { ProfileSectionDef } from "@/constants/gc-profile-schema";
import { flattenProfileSources, resolveProfileSection } from "@/lib/profile/display-profile";

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

  const resolved = useMemo(
    () => sections.map((s) => resolveProfileSection(s, flat, lng)),
    [sections, flat, lng],
  );

  const hasAnyValue = useMemo(
    () => resolved.some((s) => s.rows.some((r) => r.value !== "—")),
    [resolved],
  );

  if (!hasAnyValue && emptyMessage) {
    return <p className="text-sm text-sage-600">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-5">
      {resolved.map((section) => (
        <div key={section.title} className="rounded-lg border border-sage-200/70 bg-white/40 p-3 md:p-4">
          <h3 className="crm-font-display mb-3 text-sm font-semibold text-brand-brown">{section.title}</h3>
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
