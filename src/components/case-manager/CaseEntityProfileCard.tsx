"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StructuredProfileView } from "@/components/profile/StructuredProfileView";
import { ProfilePhotosView } from "@/components/profile/ProfilePhotosView";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import type { ProfileSectionDef } from "@/constants/gc-profile-schema";

type Props = {
  title: string;
  subtitle?: string | null;
  profileTitle: string;
  sections: ProfileSectionDef[];
  profileData: unknown;
  lng: string;
  emptyMessage: string;
  manageHref?: string | null;
  manageLabel?: string;
  /** 已在外层 section 包裹时设为 true（不再套卡片壳） */
  embedded?: boolean;
  /** 展示 GC 头像/相册（profile_data 自由键） */
  showPhotos?: boolean;
  /** 折叠记忆键；传入则启用折叠（embedded 时忽略） */
  storageKey?: string;
  defaultOpen?: boolean;
  /** 档案下方额外内容（如换绑 GC） */
  footer?: ReactNode;
};

/** 案例详情中的代母 / 准父母档案卡片（只读 profile_data，可跳转编辑） */
export function CaseEntityProfileCard({
  title,
  subtitle,
  profileTitle,
  sections,
  profileData,
  lng,
  emptyMessage,
  manageHref,
  manageLabel,
  embedded = false,
  showPhotos = false,
  storageKey,
  defaultOpen = true,
  footer,
}: Props) {
  const manageLink =
    manageHref && manageLabel ? (
      <Link
        href={manageHref}
        className="ami-ui inline-flex shrink-0 items-center gap-1 rounded-md border border-brand-brown/40 bg-white px-3 py-1.5 text-xs font-semibold text-brand-brown shadow-sm hover:bg-sage-50"
      >
        {manageLabel}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
      </Link>
    ) : null;

  const body = (
    <>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-sage-600">{profileTitle}</p>
      <StructuredProfileView sections={sections} sources={[profileData]} lng={lng} emptyMessage={emptyMessage} />
      {showPhotos ? <ProfilePhotosView profileData={profileData} /> : null}
      {footer}
    </>
  );

  if (embedded) {
    return (
      <>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-sage-200/60 pb-3">
          <div className="min-w-0">
            <h2 className="crm-font-display text-lg font-semibold text-brand-brown">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-sage-800">{subtitle}</p> : null}
          </div>
          {manageLink}
        </div>
        {body}
      </>
    );
  }

  if (storageKey) {
    return (
      <CollapsibleCard
        title={title}
        summary={subtitle || undefined}
        headerAside={manageLink}
        storageKey={storageKey}
        defaultOpen={defaultOpen}
      >
        {body}
      </CollapsibleCard>
    );
  }

  return (
    <section className="crm-card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-sage-200/60 pb-3">
        <div className="min-w-0">
          <h2 className="crm-font-display text-lg font-semibold text-brand-brown">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-sage-800">{subtitle}</p> : null}
        </div>
        {manageLink}
      </div>
      {body}
    </section>
  );
}
