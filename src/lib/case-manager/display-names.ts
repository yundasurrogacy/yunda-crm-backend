import { flattenProfileSources, formatProfileValue } from "@/lib/profile/display-profile";

function pickName(flat: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = formatProfileValue(flat[k]);
    if (v) return v;
  }
  return "";
}

/** 列表/详情标题：优先 profile_data，否则业务表邮箱 */
export function surrogateDisplayName(profileData: unknown, emailFallback?: string): string {
  const flat = flattenProfileSources(profileData);
  return pickName(flat, ["full_name", "name"]) || emailFallback?.trim() || "";
}

export function intendedParentDisplay(profileData: unknown, emailFallback?: string): string {
  const flat = flattenProfileSources(profileData);
  return pickName(flat, ["ip1_full_name", "full_name"]) || emailFallback?.trim() || "";
}
