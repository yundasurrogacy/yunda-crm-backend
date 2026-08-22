/** GC 照片存在 profile_data 自由键（不在 schema sections 里） */
export const GC_PROFILE_PHOTO_KEYS = ["profile_photo_url", "photo_urls"] as const;

export type GcProfilePhotoKey = (typeof GC_PROFILE_PHOTO_KEYS)[number];

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

/** 从 profile_data 取出照片表单字段 */
export function extractGcPhotoFormFields(profileData: unknown): Record<string, string> {
  if (!profileData || typeof profileData !== "object" || Array.isArray(profileData)) {
    return { profile_photo_url: "", photo_urls: "" };
  }
  const data = profileData as Record<string, unknown>;
  return {
    profile_photo_url: asString(data.profile_photo_url).trim(),
    photo_urls: asString(data.photo_urls).trim(),
  };
}

export function parseGcAlbumUrls(raw: string): string[] {
  return raw
    .split(/\r?\n/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function looksLikeImageUrl(url: string) {
  return /^(https?:)?\/\//i.test(url) || /\.(jpe?g|png|gif|webp|bmp|heic)(\?|#|$)/i.test(url);
}
