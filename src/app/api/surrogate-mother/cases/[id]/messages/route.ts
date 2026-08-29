import { NextResponse } from "next/server";
import { listCaseMessages, postCaseMessage } from "@/lib/case-manager/case-messages";
import { getServerSession } from "@/lib/auth/session-cookie";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("surrogate_mother")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const messages = await listCaseMessages(session, id, "surrogate_mother_api");
    if (!messages) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("surrogate_mother")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  let body: { body?: unknown; email_notify?: unknown };
  try {
    body = (await req.json()) as { body?: unknown; email_notify?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const result = await postCaseMessage(session, id, "surrogate_mother_api", {
    body: typeof body.body === "string" ? body.body : "",
    email_notify: Boolean(body.email_notify),
    author_role: "surrogate_mother",
  });
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : result.error === "insert_failed" ? 503 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  const messages = await listCaseMessages(session, id, "surrogate_mother_api");
  return NextResponse.json({ messages, id: result.id });
}
