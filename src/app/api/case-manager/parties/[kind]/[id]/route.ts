import { NextResponse } from "next/server";

import { caseManagerCanAccessParty } from "@/lib/admin/entity-profile-access";
import {
  fetchAdminEntityProfile,
  saveAdminEntityProfile,
  type EntityKind,
} from "@/lib/admin/entity-profile";
import { getServerSession } from "@/lib/auth/session-cookie";

function parseKind(raw: string): EntityKind | null {
  if (raw === "intended_parent" || raw === "surrogate_mother") return raw;
  return null;
}

type RouteCtx = { params: Promise<{ kind: string; id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { kind: kindRaw, id } = await ctx.params;
  const kind = parseKind(kindRaw);
  if (!kind) return NextResponse.json({ error: "bad_kind" }, { status: 400 });

  const allowed = await caseManagerCanAccessParty(session, kind, id);
  if (!allowed) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const detail = await fetchAdminEntityProfile(kind, id);
    if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

type PatchBody = {
  email?: string;
  profileFields?: Record<string, string>;
};

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { kind: kindRaw, id } = await ctx.params;
  const kind = parseKind(kindRaw);
  if (!kind) return NextResponse.json({ error: "bad_kind" }, { status: 400 });

  const allowed = await caseManagerCanAccessParty(session, kind, id);
  if (!allowed) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (!body.profileFields || typeof body.profileFields !== "object") {
    return NextResponse.json({ error: "missing_profile_fields" }, { status: 400 });
  }

  try {
    const ok = await saveAdminEntityProfile(kind, id, {
      email: body.email,
      profileFields: body.profileFields,
    });
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const detail = await fetchAdminEntityProfile(kind, id);
    return NextResponse.json({ ok: true, detail });
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
