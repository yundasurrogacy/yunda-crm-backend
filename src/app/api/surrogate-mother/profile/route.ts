import { NextResponse } from "next/server";
import {
  fetchAdminEntityProfile,
  saveAdminEntityProfile,
} from "@/lib/admin/entity-profile";
import { partyVisibleGcProfileSections } from "@/lib/party/redact-case-detail-for-party";
import { resolvePartyEntityId } from "@/lib/party/resolve-party-entity";
import { getServerSession } from "@/lib/auth/session-cookie";

function allowedGcSelfEditKeys(): Set<string> {
  const keys = new Set<string>();
  for (const section of partyVisibleGcProfileSections()) {
    for (const f of section.fields) keys.add(f.key);
  }
  // photos / gallery URLs stored as free-form keys in profile_data
  keys.add("photo_urls");
  keys.add("profile_photo_url");
  return keys;
}

export async function GET() {
  const session = await getServerSession();
  if (!session?.portals.includes("surrogate_mother")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const entityId = await resolvePartyEntityId("surrogate_mother", session.userId);
  if (!entityId) return NextResponse.json({ error: "not_bound" }, { status: 404 });
  try {
    const detail = await fetchAdminEntityProfile("surrogate_mother", entityId);
    if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const sections = partyVisibleGcProfileSections();
    const allowed = allowedGcSelfEditKeys();
    const profile_data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(detail.profile_data)) {
      if (allowed.has(k)) profile_data[k] = v;
    }
    return NextResponse.json({
      ...detail,
      sections,
      profile_data,
    });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session?.portals.includes("surrogate_mother")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const entityId = await resolvePartyEntityId("surrogate_mother", session.userId);
  if (!entityId) return NextResponse.json({ error: "not_bound" }, { status: 404 });

  let body: { profileFields?: Record<string, string> };
  try {
    body = (await req.json()) as { profileFields?: Record<string, string> };
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.profileFields || typeof body.profileFields !== "object") {
    return NextResponse.json({ error: "missing_profile_fields" }, { status: 400 });
  }

  const allowed = allowedGcSelfEditKeys();
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.profileFields)) {
    if (allowed.has(k) && typeof v === "string") filtered[k] = v;
  }

  try {
    const ok = await saveAdminEntityProfile("surrogate_mother", entityId, {
      profileFields: filtered,
    });
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const detail = await fetchAdminEntityProfile("surrogate_mother", entityId);
    return NextResponse.json({ ok: true, detail });
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
