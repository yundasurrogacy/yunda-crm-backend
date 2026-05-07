/** 从 contact_information / basic JSON 解显示名（与旧 admin 行为接近） */
export function surrogateDisplayName(contact: unknown): string {
  if (contact == null) return "";
  if (typeof contact === "string") return contact.trim() || "";
  if (typeof contact !== "object") return "";
  const o = contact as Record<string, unknown>;
  const first = String(o.first_name ?? o.firstName ?? "").trim();
  const last = String(o.last_name ?? o.lastName ?? "").trim();
  const full = String(o.full_name ?? o.fullName ?? "").trim();
  const name = full || [first, last].filter(Boolean).join(" ");
  return name.trim();
}

export function intendedParentDisplay(contact: unknown, emailFallback?: string): string {
  const fromContact = surrogateDisplayName(contact);
  if (fromContact) return fromContact;
  if (emailFallback?.trim()) return emailFallback.trim();
  return "";
}
