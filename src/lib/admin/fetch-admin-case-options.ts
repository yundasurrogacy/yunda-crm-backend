import { getClient } from "@/config-lib/graphql-client";
import { intendedParentDisplay, surrogateDisplayName } from "@/lib/case-manager/display-names";

export type AdminSelectOption = { id: string; label: string };

const OPTIONS_QUERY = `
  query AdminCaseOptions {
    case_managers(where: { deleted_at: { _is_null: true } }, order_by: { id: asc }, limit: 500) {
      id
      user {
        email
      }
    }
    intended_parents(where: { deleted_at: { _is_null: true } }, order_by: { id: asc }, limit: 500) {
      id
      email
      profile_data
    }
    surrogate_mothers(where: { deleted_at: { _is_null: true } }, order_by: { id: asc }, limit: 500) {
      id
      email
      profile_data
    }
  }
`;

const CM_ONLY_QUERY = `
  query AdminCaseManagerPicker {
    case_managers(where: { deleted_at: { _is_null: true } }, order_by: { id: asc }, limit: 500) {
      id
      user {
        email
      }
    }
  }
`;

function mapCm(
  r: { id: string | number; user: { email: string | null } | null },
): AdminSelectOption {
  return {
    id: String(r.id),
    label: `${r.user?.email?.trim() || "—"} (#${r.id})`,
  };
}

export async function fetchAdminCaseOptions(): Promise<{
  caseManagers: AdminSelectOption[];
  intendedParents: AdminSelectOption[];
  surrogates: AdminSelectOption[];
}> {
  const client = getClient();
  const data = await client.execute<{
    case_managers: { id: string | number; user: { email: string | null } | null }[];
    intended_parents: { id: string | number; email: string | null; profile_data: unknown }[];
    surrogate_mothers: { id: string | number; email: string | null; profile_data: unknown }[];
  }>({
    query: OPTIONS_QUERY,
  });
  return {
    caseManagers: (data.case_managers ?? []).map(mapCm),
    intendedParents: (data.intended_parents ?? []).map((r) => ({
      id: String(r.id),
      label: `${intendedParentDisplay(r.profile_data, r.email ?? undefined) || "—"} (#${r.id})`,
    })),
    surrogates: (data.surrogate_mothers ?? []).map((r) => ({
      id: String(r.id),
      label: `${surrogateDisplayName(r.profile_data, r.email ?? undefined) || "—"} (#${r.id})`,
    })),
  };
}

export async function fetchAdminCaseManagerPickerOptions(): Promise<AdminSelectOption[]> {
  const client = getClient();
  const data = await client.execute<{
    case_managers: { id: string | number; user: { email: string | null } | null }[];
  }>({ query: CM_ONLY_QUERY });
  return (data.case_managers ?? []).map(mapCm);
}
