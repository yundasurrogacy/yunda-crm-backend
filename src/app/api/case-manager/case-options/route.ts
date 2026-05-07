import { NextResponse } from "next/server";
import { getClient } from "@/config-lib/graphql-client";
import { getServerSession } from "@/lib/auth/session-cookie";
import { intendedParentDisplay, surrogateDisplayName } from "@/lib/case-manager/display-names";

const OPTIONS_QUERY = `
  query CmCaseOptions($cmWhere: case_managers_bool_exp!, $partyWhere: cases_bool_exp!) {
    case_managers(where: $cmWhere, limit: 1) {
      id
      user { email }
    }
    intended_parents(
      where: { cases: $partyWhere }
      order_by: { id: asc }
      limit: 500
    ) {
      id
      email
      contact_information
    }
    surrogate_mothers(
      where: { cases: $partyWhere }
      order_by: { id: asc }
      limit: 500
    ) {
      id
      email
      contact_information
    }
  }
`;

export async function GET() {
  const session = await getServerSession();
  if (!session?.portals.includes("case_manager")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /** 与 `/api/case-manager/dashboard` 一致：凡走案例经理端 API，均按当前登录用户绑定的案例经理筛选（含 admin 角色但有 CM 入口的账号）。 */
  const partyWhere = { case_manager: { user_users: { _eq: session.userId } } };

  const cmWhere = { user_users: { _eq: session.userId } };

  try {
    const client = getClient();
    const data = await client.execute<{
      case_managers: { id: string | number; user: { email: string | null } | null }[];
      intended_parents: { id: string | number; email: string | null; contact_information: unknown }[];
      surrogate_mothers: { id: string | number; email: string | null; contact_information: unknown }[];
    }>({
      query: OPTIONS_QUERY,
      variables: { cmWhere, partyWhere },
    });

    const cm = data.case_managers?.[0];
    return NextResponse.json({
      caseManagers: cm
        ? [
            {
              id: String(cm.id),
              label: `${cm.user?.email?.trim() || "—"} (#${cm.id})`,
            },
          ]
        : [],
      intendedParents: (data.intended_parents ?? []).map((r) => ({
        id: String(r.id),
        label: `${intendedParentDisplay(r.contact_information, r.email ?? undefined) || "—"} (#${r.id})`,
      })),
      surrogates: (data.surrogate_mothers ?? []).map((r) => ({
        id: String(r.id),
        label: `${surrogateDisplayName(r.contact_information) || r.email?.trim() || "—"} (#${r.id})`,
      })),
    });
  } catch {
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
