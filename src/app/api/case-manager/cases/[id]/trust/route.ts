import { NextResponse } from "next/server";
import {
  appendTrustLedgerEntry,
  listTrustLedger,
  TRUST_CHANGE_TYPES,
  TRUST_VISIBILITIES,
  updateTrustLedgerMeta,
  type TrustChangeType,
  type TrustVisibility,
} from "@/lib/case-manager/trust-ledger";
import { getServerSession } from "@/lib/auth/session-cookie";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const data = await listTrustLedger(session, id, "case_manager_api");
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

type PostBody = {
  change_amount?: unknown;
  change_type?: unknown;
  receiver?: unknown;
  remark?: unknown;
  voucher_url?: unknown;
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

  const amount =
    typeof body.change_amount === "number"
      ? body.change_amount
      : typeof body.change_amount === "string"
        ? Number(body.change_amount)
        : NaN;
  const change_type = String(body.change_type ?? "") as TrustChangeType;
  if (!TRUST_CHANGE_TYPES.includes(change_type)) {
    return NextResponse.json({ error: "bad_change_type" }, { status: 400 });
  }
  const visibility = (body.visibility ? String(body.visibility) : "manager") as TrustVisibility;
  if (!TRUST_VISIBILITIES.includes(visibility)) {
    return NextResponse.json({ error: "bad_visibility" }, { status: 400 });
  }

  try {
    const result = await appendTrustLedgerEntry(session, id, "case_manager_api", {
      change_amount: amount,
      change_type,
      receiver: typeof body.receiver === "string" ? body.receiver : undefined,
      remark: typeof body.remark === "string" ? body.remark : undefined,
      voucher_url: typeof body.voucher_url === "string" ? body.voucher_url : undefined,
      visibility,
    });
    if (!result.ok) {
      const status =
        result.error === "not_found" ? 404 : result.error === "update_failed" ? 503 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    const data = await listTrustLedger(session, id, "case_manager_api");
    return NextResponse.json({ ...data, wentNegative: result.wentNegative });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}

type PatchBody = {
  entryId?: unknown;
  receiver?: unknown;
  remark?: unknown;
  voucher_url?: unknown;
  visibility?: unknown;
};

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const entryId = typeof body.entryId === "string" ? body.entryId.trim() : "";
  if (!entryId) return NextResponse.json({ error: "bad_entry" }, { status: 400 });

  const visibility =
    body.visibility != null ? (String(body.visibility) as TrustVisibility) : undefined;
  if (visibility != null && !TRUST_VISIBILITIES.includes(visibility)) {
    return NextResponse.json({ error: "bad_visibility" }, { status: 400 });
  }

  try {
    const result = await updateTrustLedgerMeta(session, id, "case_manager_api", {
      entryId,
      receiver:
        typeof body.receiver === "string" ? body.receiver : body.receiver === null ? null : undefined,
      remark: typeof body.remark === "string" ? body.remark : body.remark === null ? null : undefined,
      voucher_url:
        typeof body.voucher_url === "string"
          ? body.voucher_url
          : body.voucher_url === null
            ? null
            : undefined,
      visibility,
    });
    if (!result.ok) {
      const status =
        result.error === "not_found" ? 404 : result.error === "update_failed" ? 503 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    const data = await listTrustLedger(session, id, "case_manager_api");
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
