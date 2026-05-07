import { NextResponse } from "next/server";

import { getClient } from "@/config-lib/graphql-client";
import { getServerSession } from "@/lib/auth/session-cookie";
import { linkEntityToUser } from "@/lib/admin/link-entity-user";

type AccountKind = "case_manager" | "intended_parent" | "surrogate_mother";

function parseKind(raw: unknown): AccountKind | null {
  if (raw === "case_manager" || raw === "intended_parent" || raw === "surrogate_mother") return raw;
  return null;
}

function parseId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return /^\d+$/u.test(t) ? t : null;
}

type LinkBody = {
  kind?: AccountKind;
  entityId?: string;
  userEmail?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: LinkBody;
  try {
    body = (await req.json()) as LinkBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const kind = parseKind(body.kind);
  const entityId = parseId(body.entityId ?? "");
  const userEmail = typeof body.userEmail === "string" ? body.userEmail : "";

  if (!kind || !entityId || !userEmail.trim()) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const client = getClient();
  const result = await linkEntityToUser(client, kind, entityId, userEmail);

  if (result.ok) {
    return NextResponse.json({ ok: true });
  }

  const status =
    result.code === "user_not_found" || result.code === "entity_not_found"
      ? 404
      : result.code === "user_bound_elsewhere"
        ? 409
        : 500;

  return NextResponse.json({ error: result.code }, { status });
}
