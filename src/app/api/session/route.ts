import { NextResponse } from "next/server";
import { authenticateCrmUser } from "@/lib/auth/authenticate-user";
import { normalizePortals } from "@/lib/auth/session-codec";
import {
  clearServerSession,
  getServerSession,
  setServerSession,
} from "@/lib/auth/session-cookie";

type SessionPostBody =
  | { action: "login"; email?: string; password?: string }
  | { action: "logout" }
  | { action: "setActivePortal"; portal?: string }
  | { action: "clearActivePortal" };

/**
 * 统一会话 API（避免 dev 增量编译遗漏部分 api/auth 子路由导致 404）。
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<SessionPostBody> | null;
  const action = body?.action;

  if (
    action !== "login" &&
    action !== "logout" &&
    action !== "setActivePortal" &&
    action !== "clearActivePortal"
  ) {
    return NextResponse.json({ error: "无效请求。" }, { status: 400 });
  }

  switch (action) {
    case "login": {
      const email = typeof body?.email === "string" ? body.email : "";
      const password = typeof body?.password === "string" ? body.password : "";
      const result = await authenticateCrmUser(email, password);
      if (!result.ok) {
        if (result.reason === "misconfigured") {
          return NextResponse.json(
            { error: "系统暂时无法登录，请稍后再试或联系管理员。" },
            { status: 503 },
          );
        }
        return NextResponse.json(
          { error: "邮箱或密码不正确，请重新输入。" },
          { status: 401 },
        );
      }
      await setServerSession(result.session);
      return NextResponse.json({ ok: true });
    }
    case "logout": {
      await clearServerSession();
      return NextResponse.json({ ok: true });
    }
    case "setActivePortal": {
      const portal =
        body && "portal" in body && typeof body.portal === "string" ? body.portal : "";
      const [normalized] = normalizePortals(portal ? [portal] : []);
      if (!normalized) {
        return NextResponse.json({ error: "无效入口。" }, { status: 400 });
      }
      const s = await getServerSession();
      if (!s) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      }
      if (!s.portals.includes(normalized)) {
        return NextResponse.json({ error: "无此入口权限。" }, { status: 403 });
      }
      await setServerSession({ ...s, activePortal: normalized });
      return NextResponse.json({ ok: true });
    }
    case "clearActivePortal": {
      const s = await getServerSession();
      if (!s) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      }
      await setServerSession({ ...s, activePortal: null });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "无效请求。" }, { status: 400 });
  }
}
