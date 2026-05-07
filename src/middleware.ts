import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CRM_SESSION_COOKIE } from "@/lib/auth/constants";
import { parseSession } from "@/lib/auth/session-codec";
import type { PortalId } from "@/types/portal";

function portalFromPath(pathname: string): PortalId | "admin" | null {
  if (pathname.startsWith("/case_manager")) return "case_manager";
  if (pathname.startsWith("/intended_parent")) return "intended_parent";
  if (pathname.startsWith("/surrogate_mother")) return "surrogate_mother";
  if (pathname.startsWith("/admin")) return "admin";
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/select-portal") {
    const raw = request.cookies.get(CRM_SESSION_COOKIE)?.value;
    if (!parseSession(raw)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const segment = portalFromPath(pathname);
  if (!segment) return NextResponse.next();

  const raw = request.cookies.get(CRM_SESSION_COOKIE)?.value;
  const s = parseSession(raw);
  if (!s) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (segment === "admin") {
    if (s.role !== "admin") {
      return NextResponse.redirect(new URL("/select-portal", request.url));
    }
    return NextResponse.next();
  }

  if (!s.portals.includes(segment)) {
    return NextResponse.redirect(new URL("/select-portal", request.url));
  }

  if (s.activePortal !== segment) {
    return NextResponse.redirect(new URL("/select-portal", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/case_manager/:path*",
    "/intended_parent/:path*",
    "/surrogate_mother/:path*",
    "/admin/:path*",
    "/select-portal",
  ],
};
