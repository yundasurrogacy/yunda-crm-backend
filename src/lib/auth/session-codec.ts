import type { CrmSession, PortalId } from "@/types/portal";

/** UTF-8 → base64url（Edge / Node） */
export function stringifySession(sess: CrmSession): string {
  const raw = JSON.stringify(sess);
  const bytes = new TextEncoder().encode(raw);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

export function parseSession(cookieValue: string | undefined): CrmSession | null {
  if (!cookieValue) return null;
  try {
    const padded = cookieValue.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4;
    const base64 = pad ? padded + "=".repeat(4 - pad) : padded;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json) as CrmSession;
    if (
      typeof data?.userId === "string" &&
      typeof data?.email === "string" &&
      typeof data?.role === "string" &&
      Array.isArray(data.portals)
    ) {
      return {
        userId: data.userId,
        email: data.email,
        role: data.role,
        portals: normalizePortals(data.portals),
        activePortal:
          data.activePortal === null || data.activePortal === undefined
            ? null
            : (normalizePortals([data.activePortal])[0] ?? null),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function normalizePortals(list: unknown[]): PortalId[] {
  const allowed = new Set<PortalId>([
    "case_manager",
    "intended_parent",
    "surrogate_mother",
  ]);
  const out: PortalId[] = [];
  for (const x of list) {
    if (typeof x !== "string") continue;
    if (allowed.has(x as PortalId)) out.push(x as PortalId);
  }
  return [...new Set(out)];
}
