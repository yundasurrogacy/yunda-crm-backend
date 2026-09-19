"use client";

import { useTranslation } from "react-i18next";
import { AmQiniuFileInput } from "@/components/case-manager/AmQiniuFileInput";
import { AmQiniuFileMultiInput } from "@/components/case-manager/AmQiniuFileMultiInput";
import { looksLikeImageUrl, parseGcAlbumUrls } from "@/lib/profile/gc-photos";

type Props = {
  entityId: string;
  /** `profile_photo_url` 自由键 */
  avatarUrl: string;
  /** `photo_urls` 自由键（换行分隔） */
  albumRaw: string;
  onChangeAvatar: (v: string) => void;
  onChangeAlbumRaw: (v: string) => void;
  disabled?: boolean;
};

/** 管理端编辑 GC 头像 / 相册（与 GC 自述页共用同一组 profile_data 自由键）。 */
export function GcProfilePhotosEditor({
  entityId,
  avatarUrl,
  albumRaw,
  onChangeAvatar,
  onChangeAlbumRaw,
  disabled = false,
}: Props) {
  const { t } = useTranslation("portal");
  const albumUrls = parseGcAlbumUrls(albumRaw);
  const avatar = avatarUrl.trim();

  return (
    <div className="space-y-5">
      <p className="text-sm text-sage-700">{t("profile_photos.admin_intro")}</p>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage-600">
          {t("profile_photos.avatar")}
        </p>
        {avatar && looksLikeImageUrl(avatar) ? (
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <a href={avatar} target="_blank" rel="noreferrer" className="block shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar}
                alt=""
                className="h-28 w-28 rounded-lg border border-sage-200 object-cover bg-sage-50"
              />
            </a>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChangeAvatar("")}
              className="rounded-md border border-sage-300 bg-white px-3 py-1.5 text-xs font-semibold text-sage-800 hover:bg-sage-50 disabled:opacity-50"
            >
              {t("sm_profile.remove_photo")}
            </button>
          </div>
        ) : (
          <p className="mb-2 break-all text-xs text-sage-600">{avatar || t("sm_profile.no_avatar")}</p>
        )}
        <AmQiniuFileInput
          inputId={`admin-gc-photo-${entityId}`}
          caseId={`sm-${entityId}`}
          value={avatarUrl}
          onChange={onChangeAvatar}
          disabled={disabled}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage-600">
          {t("profile_photos.album")}
        </p>
        {albumUrls.length === 0 ? (
          <p className="mb-2 text-xs text-sage-500">{t("sm_profile.no_album")}</p>
        ) : null}
        <AmQiniuFileMultiInput
          inputId={`admin-gc-album-${entityId}`}
          caseId={`sm-${entityId}-album`}
          value={albumUrls}
          onChange={(urls) => onChangeAlbumRaw(urls.join("\n"))}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
