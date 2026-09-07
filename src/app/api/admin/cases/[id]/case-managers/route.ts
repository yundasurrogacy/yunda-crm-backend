import { NextResponse } from "next/server";

import { getClient } from "@/config-lib/graphql-client";
import { getServerSession } from "@/lib/auth/session-cookie";
import {
  addAuxiliaryCaseManager,
  assertActiveCaseManager,
  getPrimaryCaseManagerId,
  listCaseManagerAssignments,
  setPrimaryAndLinkCaseManagers,
  unlinkCaseManagerFromCase,
} from "@/lib/case-manager/case-case-managers";
import { fetchAdminCaseManagerPickerOptions } from "@/lib/admin/fetch-admin-case-options";

const CASE_EXISTS = `
  query AdminCaseExists($id: bigint!) {
    cases_by_pk(id: $id) { id }
  }
`;

type Body = {
  action?: unknown;
  caseManagerId?: unknown;
};

function parseId(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return String(Math.trunc(raw));
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return /^\d+$/u.test(t) ? t : null;
}

async function caseExists(caseId: string): Promise<boolean> {
  const client = getClient();
  const data = await client.execute<{ cases_by_pk: { id: string | number } | null }>({
    query: CASE_EXISTS,
    variables: { id: caseId },
  });
  return Boolean(data.cases_by_pk);
}

/** 管理端：查看案例下的案例经理（主负责 + 辅助） */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!/^\d+$/u.test(id)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  try {
    const [result, caseManagers] = await Promise.all([
      listCaseManagerAssignments(id),
      fetchAdminCaseManagerPickerOptions(),
    ]);
    if (!result) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ...result, caseManagers });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

/**
 * 管理端操作（单个案例）：
 * - set_primary：设置 / 更改主负责（写入主 FK + M2M；原主负责仍留在辅助列表）
 * - add：添加辅助案例经理（仅 M2M）
 * - remove：移除辅助案例经理（不可直接移除主负责，请先更改主负责）
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: caseId } = await context.params;
  if (!/^\d+$/u.test(caseId)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  const cmId = parseId(body.caseManagerId);
  if (!cmId || !["add", "set_primary", "remove"].includes(action)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    if (!(await caseExists(caseId))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (action !== "remove") {
      if (!(await assertActiveCaseManager(cmId))) {
        return NextResponse.json({ error: "case_manager_not_found" }, { status: 404 });
      }
    }

    if (action === "set_primary") {
      await setPrimaryAndLinkCaseManagers([caseId], cmId);
      const result = await listCaseManagerAssignments(caseId);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "add") {
      const primaryId = await getPrimaryCaseManagerId(caseId);
      if (primaryId === cmId) {
        return NextResponse.json({ error: "already_primary" }, { status: 409 });
      }
      await addAuxiliaryCaseManager(caseId, cmId);
      const result = await listCaseManagerAssignments(caseId);
      return NextResponse.json({ ok: true, ...result });
    }

    const primaryId = await getPrimaryCaseManagerId(caseId);
    if (primaryId === cmId) {
      return NextResponse.json({ error: "cannot_remove_primary" }, { status: 409 });
    }
    await unlinkCaseManagerFromCase(caseId, cmId);
    const result = await listCaseManagerAssignments(caseId);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
