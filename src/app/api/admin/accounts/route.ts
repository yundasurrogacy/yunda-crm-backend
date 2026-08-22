import { NextResponse } from "next/server";

import { getClient } from "@/config-lib/graphql-client";
import { md5PasswordHexLower } from "@/lib/auth/password";
import { getServerSession } from "@/lib/auth/session-cookie";
import { fetchCaseManagerCaseloads } from "@/lib/admin/case-manager-caseload";
import { createCaseManagerEntity } from "@/lib/admin/create-case-manager-entity";
import { createPartyEntity } from "@/lib/party/create-party-entity";
import { mergeActiveWhere } from "@/lib/soft-delete/entity-soft-delete";
import type { EntityKind } from "@/lib/admin/entity-profile";

type AccountKind = "case_manager" | "intended_parent" | "surrogate_mother";

const LIST_CASE_MANAGERS = `
  query AdminListCaseManagers($where: case_managers_bool_exp!, $limit: Int!, $offset: Int!) {
    case_managers_aggregate(where: $where) { aggregate { count } }
    case_managers(where: $where, limit: $limit, offset: $offset, order_by: { id: desc }) {
      id
      email
      deleted_at
      user { id email role }
    }
  }
`;

const LIST_INTENDED_PARENTS = `
  query AdminListIntendedParents($where: intended_parents_bool_exp!, $limit: Int!, $offset: Int!) {
    intended_parents_aggregate(where: $where) { aggregate { count } }
    intended_parents(where: $where, limit: $limit, offset: $offset, order_by: { id: desc }) {
      id
      email
      deleted_at
      user { id email role }
    }
  }
`;

const LIST_SURROGATES = `
  query AdminListSurrogates($where: surrogate_mothers_bool_exp!, $limit: Int!, $offset: Int!) {
    surrogate_mothers_aggregate(where: $where) { aggregate { count } }
    surrogate_mothers(where: $where, limit: $limit, offset: $offset, order_by: { id: desc }) {
      id
      email
      deleted_at
      user { id email role }
    }
  }
`;

const UPDATE_USER = `
  mutation AdminUpdateUser($id: bigint!, $changes: users_set_input!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: $changes) { id }
  }
`;

function parseKind(raw: string | null): AccountKind | null {
  if (raw === "case_manager" || raw === "intended_parent" || raw === "surrogate_mother") return raw;
  return null;
}

function parseId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return /^\d+$/u.test(t) ? t : null;
}

/** 列表筛选：邮箱模糊匹配；纯数字时同时按业务表 id 精确匹配（便于搜未绑用户的行）。 */
function searchWhereCaseManagers(q: string): Record<string, unknown> {
  if (!q) return {};
  const parts: Record<string, unknown>[] = [
    { email: { _ilike: `%${q}%` } },
    { user: { email: { _ilike: `%${q}%` } } },
  ];
  if (/^\d+$/u.test(q)) parts.push({ id: { _eq: q } });
  return { _or: parts };
}

function searchWhereIpOrSm(q: string): Record<string, unknown> {
  if (!q) return {};
  const parts: Record<string, unknown>[] = [
    { email: { _ilike: `%${q}%` } },
    { user: { email: { _ilike: `%${q}%` } } },
  ];
  if (/^\d+$/u.test(q)) parts.push({ id: { _eq: q } });
  return { _or: parts };
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const kind = parseKind(searchParams.get("kind"));
  if (!kind) return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  const q = (searchParams.get("q") ?? "").trim();
  const includeDeleted = searchParams.get("includeDeleted") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10) || 10));
  const limit = pageSize;
  const offset = (page - 1) * limit;
  try {
    const client = getClient();
    if (kind === "case_manager") {
      const where = includeDeleted
        ? searchWhereCaseManagers(q)
        : mergeActiveWhere(searchWhereCaseManagers(q));
      const data = await client.execute<{
        case_managers_aggregate: { aggregate: { count: number } | null };
        case_managers: {
          id: string | number;
          email: string | null;
          deleted_at: string | null;
          user: { id: string | number; email: string; role: string } | null;
        }[];
      }>({ query: LIST_CASE_MANAGERS, variables: { where, limit, offset } });
      const rowsBase = (data.case_managers ?? []).map((r) => ({
        entityId: String(r.id),
        userId: r.user ? String(r.user.id) : null,
        email: r.user?.email ?? r.email ?? "",
        role: r.user?.role ?? "",
        deleted_at: r.deleted_at ?? null,
      }));
      const caseloads = await fetchCaseManagerCaseloads(rowsBase.map((r) => r.entityId));
      return NextResponse.json({
        rows: rowsBase.map((r) => ({
          ...r,
          caseCount: caseloads[r.entityId] ?? 0,
        })),
        total: data.case_managers_aggregate?.aggregate?.count ?? 0,
        page,
        pageSize,
      });
    }
    if (kind === "intended_parent") {
      const where = includeDeleted
        ? searchWhereIpOrSm(q)
        : mergeActiveWhere(searchWhereIpOrSm(q));
      const data = await client.execute<{
        intended_parents_aggregate: { aggregate: { count: number } | null };
        intended_parents: {
          id: string | number;
          email: string | null;
          deleted_at: string | null;
          user: { id: string | number; email: string; role: string } | null;
        }[];
      }>({ query: LIST_INTENDED_PARENTS, variables: { where, limit, offset } });
      return NextResponse.json({
        rows: (data.intended_parents ?? []).map((r) => ({
          entityId: String(r.id),
          userId: r.user ? String(r.user.id) : null,
          email: r.user?.email ?? r.email ?? "",
          role: r.user?.role ?? "",
          deleted_at: r.deleted_at ?? null,
        })),
        total: data.intended_parents_aggregate?.aggregate?.count ?? 0,
        page,
        pageSize,
      });
    }
    const where = includeDeleted
      ? searchWhereIpOrSm(q)
      : mergeActiveWhere(searchWhereIpOrSm(q));
    const data = await client.execute<{
      surrogate_mothers_aggregate: { aggregate: { count: number } | null };
      surrogate_mothers: {
        id: string | number;
        email: string | null;
        deleted_at: string | null;
        user: { id: string | number; email: string; role: string } | null;
      }[];
    }>({ query: LIST_SURROGATES, variables: { where, limit, offset } });
    return NextResponse.json({
      rows: (data.surrogate_mothers ?? []).map((r) => ({
        entityId: String(r.id),
        userId: r.user ? String(r.user.id) : null,
        email: r.user?.email ?? r.email ?? "",
        role: r.user?.role ?? "",
        deleted_at: r.deleted_at ?? null,
      })),
      total: data.surrogate_mothers_aggregate?.aggregate?.count ?? 0,
      page,
      pageSize,
    });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

type PatchBody = {
  userId: string;
  email?: string;
  role?: string;
  password?: string;
};

type PostBody = {
  kind?: unknown;
  email?: unknown;
  displayName?: unknown;
};

/** 直接建 CM/IP/GC 业务主体（可不绑登录账号） */
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const kindRaw = typeof body.kind === "string" ? body.kind : "";
  if (kindRaw === "case_manager") {
    const email = typeof body.email === "string" ? body.email : "";
    const result = await createCaseManagerEntity(email);
    if (!result.ok) {
      const status =
        result.error === "bad_email" ? 400 : result.error === "email_taken" ? 409 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true, id: result.id });
  }
  if (kindRaw !== "intended_parent" && kindRaw !== "surrogate_mother") {
    return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  }
  const kind = kindRaw as EntityKind;
  const email = typeof body.email === "string" ? body.email : "";
  const displayName = typeof body.displayName === "string" ? body.displayName : undefined;
  const result = await createPartyEntity({ kind, email, displayName });
  if (!result.ok) {
    const status =
      result.error === "bad_email" ? 400 : result.error === "email_taken" ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, id: result.id });
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const userId = parseId(body.userId);
  if (!userId) return NextResponse.json({ error: "bad_user_id" }, { status: 400 });
  const changes: Record<string, unknown> = {};
  if (typeof body.email === "string" && body.email.trim()) changes.email = body.email.trim().toLowerCase();
  if (typeof body.role === "string" && body.role.trim()) changes.role = body.role.trim().toLowerCase();
  if (typeof body.password === "string" && body.password) changes.password = md5PasswordHexLower(body.password);
  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "empty_changes" }, { status: 400 });
  }
  try {
    const client = getClient();
    await client.execute<{ update_users_by_pk: { id: string | number } | null }>({
      query: UPDATE_USER,
      variables: { id: userId, changes },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
