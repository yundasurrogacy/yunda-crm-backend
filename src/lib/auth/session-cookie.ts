import { cookies } from "next/headers";
import type { CrmSession } from "@/types/portal";
import { CRM_SESSION_COOKIE } from "./constants";
import { parseSession, stringifySession } from "./session-codec";

const maxAge = 60 * 60 * 24 * 7;

export async function getServerSession(): Promise<CrmSession | null> {
  const jar = await cookies();
  return parseSession(jar.get(CRM_SESSION_COOKIE)?.value);
}

export async function setServerSession(sess: CrmSession) {
  const jar = await cookies();
  jar.set(CRM_SESSION_COOKIE, stringifySession(sess), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearServerSession() {
  const jar = await cookies();
  jar.set(CRM_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
