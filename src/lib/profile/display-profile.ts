import type { ProfileFieldDef, ProfileSectionDef } from "@/constants/gc-profile-schema";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/** 将 profile_data 压平为 key → value（仅叶子节点） */
export function flattenProfileSources(...sources: unknown[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  function walk(node: unknown, prefix: string) {
    if (node == null) return;
    if (Array.isArray(node)) {
      if (node.length) out[prefix || "items"] = node;
      return;
    }
    if (!isPlainObject(node)) {
      if (prefix) out[prefix] = node;
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      const next = prefix ? `${prefix}.${k}` : k;
      if (isPlainObject(v) || Array.isArray(v)) walk(v, next);
      else out[k] = v;
    }
  }

  for (const src of sources) walk(src, "");
  return out;
}

export function formatProfileValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x)))
      .filter(Boolean)
      .join(", ");
  }
  if (isPlainObject(value)) {
    return Object.entries(value)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${k}: ${formatProfileValue(v)}`)
      .join("; ");
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function resolveProfileFieldValue(
  flat: Record<string, unknown>,
  field: ProfileFieldDef,
): string {
  const formatted = formatProfileValue(flat[field.key]);
  return formatted || "";
}

export type ResolvedProfileRow = {
  key: string;
  label: string;
  value: string;
};

export function resolveProfileSection(
  section: ProfileSectionDef,
  flat: Record<string, unknown>,
  lng: string,
): { title: string; rows: ResolvedProfileRow[] } {
  const zh = lng.toLowerCase().startsWith("zh");
  const title = zh ? section.titleZh : section.titleEn;
  const rows = section.fields.map((field) => {
    const label = zh ? field.labelZh : field.labelEn;
    const raw = resolveProfileFieldValue(flat, field);
    return { key: field.key, label, value: raw || "—" };
  });
  return { title, rows };
}
