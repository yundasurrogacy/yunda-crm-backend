"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  extractGcPhotoFormFields,
  looksLikeImageUrl,
  parseGcAlbumUrls,
} from "@/lib/profile/gc-photos";

/** 只读展示 GC profile_data 中的头像与相册 */
export function ProfilePhotosView({
  profileData,
  className,
  emptyMessage,
}: {
  profileData: unknown;
  className?: string;
  /** 无照片时展示的文案；不传则整块不渲染 */
  emptyMessage?: string;
}) {
  const { t } = useTranslation("portal");
  const photos = useMemo(() => extractGcPhotoFormFields(profileData), [profileData]);
  const album = useMemo(() => parseGcAlbumUrls(photos.photo_urls), [photos.photo_urls]);
  const avatar = photos.profile_photo_url.trim();

  if (!avatar && album.length === 0) {
    if (!emptyMessage) return null;
    return (
      <div className={className ?? "mt-4 border-t border-sage-200/70 pt-4"}>
        <h3 className="crm-font-display mb-2 text-sm font-semibold text-brand-brown">
          {t("profile_photos.title")}
        </h3>
        <p className="text-sm text-sage-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className ?? "mt-4 border-t border-sage-200/70 pt-4"}>
      <h3 className="crm-font-display mb-3 text-sm font-semibold text-brand-brown">
        {t("profile_photos.title")}
      </h3>
      {avatar ? (
        <div className="mb-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-sage-600">
            {t("profile_photos.avatar")}
          </p>
          {looksLikeImageUrl(avatar) ? (
            <a href={avatar} target="_blank" rel="noreferrer" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar}
                alt=""
                className="h-24 w-24 rounded-lg border border-sage-200 object-cover bg-sage-50"
              />
            </a>
          ) : (
            <a
              href={avatar}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm text-brand-brown underline"
            >
              {avatar}
            </a>
          )}
        </div>
      ) : null}
      {album.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-sage-600">
            {t("profile_photos.album")}
          </p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {album.map((url) => (
              <li key={url}>
                {looksLikeImageUrl(url) ? (
                  <a href={url} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="aspect-square w-full rounded-md border border-sage-200 object-cover bg-sage-50"
                    />
                  </a>
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex aspect-square items-center justify-center break-all rounded-md border border-sage-200 bg-sage-50 p-1 text-center text-[10px] text-brand-brown underline"
                  >
                    {t("profile_photos.open")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
