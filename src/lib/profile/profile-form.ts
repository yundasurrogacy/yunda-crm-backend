import type { ProfileFieldDef, ProfileSectionDef } from "@/constants/gc-profile-schema";
import { flattenProfileSources, resolveProfileFieldValue } from "@/lib/profile/display-profile";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/** 从合并后的数据源生成表单初始值（按 schema key） */
export function buildProfileFormValues(
  sections: ProfileSectionDef[],
  sources: unknown[],
  /** schema 外的自由键（如 GC 照片），一并写入表单以免保存后丢失回显 */
  extraKeys: readonly string[] = [],
): Record<string, string> {
  const flat = flattenProfileSources(...sources);
  const out: Record<string, string> = {};
  for (const section of sections) {
    for (const field of section.fields) {
      out[field.key] = resolveProfileFieldValue(flat, field);
    }
  }
  for (const key of extraKeys) {
    const v = flat[key];
    if (typeof v === "string") out[key] = v;
    else if (v == null) out[key] = "";
    else if (Array.isArray(v)) {
      out[key] = v.map((x) => (typeof x === "string" ? x : "")).filter(Boolean).join("\n");
    } else out[key] = String(v);
  }
  return out;
}

/** 将表单写入 profile_data（保留原有未在表单中的键） */
export function mergeProfileDataFromForm(
  existingProfileData: unknown,
  formValues: Record<string, string>,
): Record<string, unknown> {
  const base: Record<string, unknown> = isPlainObject(existingProfileData)
    ? { ...existingProfileData }
    : {};

  for (const [key, raw] of Object.entries(formValues)) {
    const v = raw.trim();
    if (v) base[key] = v;
    else delete base[key];
  }

  return base;
}

export function allProfileFields(sections: ProfileSectionDef[]): ProfileFieldDef[] {
  return sections.flatMap((s) => s.fields);
}
