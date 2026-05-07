import { NextResponse } from "next/server";
import { getClient } from "@/config-lib/graphql-client";
import { bindUserToBusinessRole, type BindRoleKind } from "@/lib/admin/bind-user-role";
import { md5PasswordHexLower } from "@/lib/auth/password";
import { getServerSession } from "@/lib/auth/session-cookie";

const LIST_USERS = `
  query AdminListUsers($where: users_bool_exp!, $limit: Int!, $offset: Int!) {
    users_aggregate(where: $where) {
      aggregate {
        count
      }
    }
    users(where: $where, limit: $limit, offset: $offset, order_by: { id: desc }) {
      id
      email
      role
      created_at
      case_manager {
        id
      }
      intended_parent {
        id
      }
      surrogate_mother {
        id
      }
    }
  }
`;

const INSERT_USER = `
  mutation AdminInsertUser($email: String!, $password: String!, $role: String!) {
    insert_users_one(object: { email: $email, password: $password, role: $role }) {
      id
      email
    }
  }
`;

const UPDATE_USER = `
  mutation AdminUpdateUser($id: bigint!, $changes: users_set_input!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: $changes) {
      id
    }
  }
`;

function parseId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return /^\d+$/u.test(t) ? t : null;
}

function parseBindKinds(raw: unknown): BindRoleKind[] {
  if (!Array.isArray(raw)) return [];
  const allowed: BindRoleKind[] = ["case_manager", "intended_parent", "surrogate_mother"];
  const out: BindRoleKind[] = [];
  for (const x of raw) {
    if (typeof x === "string" && (allowed as readonly string[]).includes(x)) {
      out.push(x as BindRoleKind);
    }
  }
  return [...new Set(out)];
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10) || 10));
  const limit = pageSize;
  const offset = (page - 1) * limit;
  const where = q ? { email: { _ilike: `%${q}%` } } : {};
  try {
    const client = getClient();
    const data = await client.execute<{
      users_aggregate: { aggregate: { count: number } | null };
      users: {
        id: string | number;
        email: string;
        role: string;
        created_at: string;
        case_manager: { id: string | number } | null;
        intended_parent: { id: string | number } | null;
        surrogate_mother: { id: string | number } | null;
      }[];
    }>({
      query: LIST_USERS,
      variables: { where, limit, offset },
    });
    return NextResponse.json({
      rows: (data.users ?? []).map((u) => ({
        userId: String(u.id),
        email: u.email,
        role: u.role,
        createdAt: u.created_at,
        caseManagerId: u.case_manager?.id != null ? String(u.case_manager.id) : null,
        intendedParentId: u.intended_parent?.id != null ? String(u.intended_parent.id) : null,
        surrogateId: u.surrogate_mother?.id != null ? String(u.surrogate_mother.id) : null,
      })),
      total: data.users_aggregate?.aggregate?.count ?? 0,
      page,
      pageSize,
    });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

type PostBody = {
  email: string;
  password: string;
  role?: string;
  bind?: unknown;
};

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
  if (!body.email?.trim() || !body.password) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const role = (body.role?.trim() || "user").toLowerCase();
  const email = body.email.trim().toLowerCase();
  const password = md5PasswordHexLower(body.password);
  const binds = parseBindKinds(body.bind);
  try {
    const client = getClient();
    const u = await client.execute<{
      insert_users_one: { id: string | number; email: string } | null;
    }>({
      query: INSERT_USER,
      variables: { email, password, role },
    });
    const created = u.insert_users_one;
    if (created?.id == null) {
      return NextResponse.json({ error: "create_failed" }, { status: 500 });
    }
    const uid = String(created.id);
    const userEmail = created.email ?? email;
    const linked: Record<string, { entityId: string; alreadyLinked: boolean } | { error: string }> = {};
    for (const kind of binds) {
      const r = await bindUserToBusinessRole(client, uid, kind, userEmail);
      if (r.ok) {
        linked[kind] = { entityId: r.entityId, alreadyLinked: r.alreadyLinked };
      } else {
        linked[kind] = { error: r.message };
      }
    }
    return NextResponse.json({ userId: uid, linked }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}

type PatchBody = {
  userId: string;
  email?: string;
  role?: string;
  password?: string;
};

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
