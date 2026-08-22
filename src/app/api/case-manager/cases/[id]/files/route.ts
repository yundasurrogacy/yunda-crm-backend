import { NextResponse } from "next/server";
import {
  addCaseFile,
  CASE_FILE_ABOUT_ROLES,
  CASE_FILE_CATEGORIES,
  CASE_FILE_VISIBILITIES,
  listCaseFiles,
  type CaseFileAboutRole,
  type CaseFileCategory,
  type CaseFileVisibility,
} from "@/lib/case-manager/case-files";
import { getServerSession } from "@/lib/auth/session-cookie";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const files = await listCaseFiles(session, id, "case_manager_api");
    if (!files) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

type PostBody = {
  category?: unknown;
  file_url?: unknown;
  about_role?: unknown;
  file_type?: unknown;
  note?: unknown;
  visibility?: unknown;
};

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const category = String(body.category ?? "") as CaseFileCategory;
  if (!CASE_FILE_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "bad_category" }, { status: 400 });
  }
  const file_url = typeof body.file_url === "string" ? body.file_url : "";
  const aboutRaw = body.about_role == null || body.about_role === "" ? null : String(body.about_role);
  const about_role = aboutRaw as CaseFileAboutRole | null;
  if (about_role && !CASE_FILE_ABOUT_ROLES.includes(about_role)) {
    return NextResponse.json({ error: "bad_about_role" }, { status: 400 });
  }
  const visibilityRaw = body.visibility == null || body.visibility === "" ? undefined : String(body.visibility);
  const visibility = visibilityRaw as CaseFileVisibility | undefined;
  if (visibility && !CASE_FILE_VISIBILITIES.includes(visibility)) {
    return NextResponse.json({ error: "bad_visibility" }, { status: 400 });
  }

  try {
    const result = await addCaseFile(session, id, "case_manager_api", {
      category,
      file_url,
      about_role,
      file_type: typeof body.file_type === "string" ? body.file_type : null,
      note: typeof body.note === "string" ? body.note : null,
      visibility,
    });
    if (!result.ok) {
      const status = result.error === "not_found" ? 404 : result.error === "insert_failed" ? 503 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    const files = await listCaseFiles(session, id, "case_manager_api");
    return NextResponse.json({ files, id: result.id });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
