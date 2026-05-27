import { getClient } from "@/config-lib/graphql-client";
import { GC_PROFILE_SECTIONS } from "@/constants/gc-profile-schema";
import { IP_PROFILE_SECTIONS } from "@/constants/ip-profile-schema";
import type { ProfileSectionDef } from "@/constants/gc-profile-schema";
import { intendedParentDisplay, surrogateDisplayName } from "@/lib/case-manager/display-names";
import { mergeProfileDataFromForm } from "@/lib/profile/profile-form";

export type EntityKind = "intended_parent" | "surrogate_mother";

const IP_DETAIL = `
  query AdminIntendedParentDetail($id: bigint!) {
    intended_parents_by_pk(id: $id) {
      id
      email
      profile_data
      user { id email role }
    }
  }
`;

const SM_DETAIL = `
  query AdminSurrogateDetail($id: bigint!) {
    surrogate_mothers_by_pk(id: $id) {
      id
      email
      profile_data
      user { id email role }
    }
  }
`;

const UPDATE_IP = `
  mutation AdminUpdateIntendedParent($id: bigint!, $set: intended_parents_set_input!) {
    update_intended_parents_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

const UPDATE_SM = `
  mutation AdminUpdateSurrogate($id: bigint!, $set: surrogate_mothers_set_input!) {
    update_surrogate_mothers_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

export type AdminEntityProfileDetail = {
  kind: EntityKind;
  id: string;
  email: string;
  displayName: string;
  userId: string | null;
  userEmail: string | null;
  profile_data: Record<string, unknown>;
  sections: ProfileSectionDef[];
};

export function profileSectionsForKind(kind: EntityKind): ProfileSectionDef[] {
  return kind === "intended_parent" ? IP_PROFILE_SECTIONS : GC_PROFILE_SECTIONS;
}

export async function fetchAdminEntityProfile(
  kind: EntityKind,
  idRaw: string,
): Promise<AdminEntityProfileDetail | null> {
  if (!/^\d+$/u.test(idRaw)) return null;
  const client = getClient();

  if (kind === "intended_parent") {
    const data = await client.execute<{
      intended_parents_by_pk: {
        id: string | number;
        email: string | null;
        profile_data: unknown;
        user: { id: string | number; email: string } | null;
      } | null;
    }>({ query: IP_DETAIL, variables: { id: idRaw } });

    const row = data.intended_parents_by_pk;
    if (!row) return null;
    const profile_data = (row.profile_data && typeof row.profile_data === "object"
      ? row.profile_data
      : {}) as Record<string, unknown>;

    return {
      kind,
      id: String(row.id),
      email: row.email?.trim() ?? "",
      displayName: intendedParentDisplay(profile_data, row.email ?? undefined) || row.email || "",
      userId: row.user ? String(row.user.id) : null,
      userEmail: row.user?.email ?? null,
      profile_data,
      sections: IP_PROFILE_SECTIONS,
    };
  }

  const data = await client.execute<{
    surrogate_mothers_by_pk: {
      id: string | number;
      email: string | null;
      profile_data: unknown;
      user: { id: string | number; email: string } | null;
    } | null;
  }>({ query: SM_DETAIL, variables: { id: idRaw } });

  const row = data.surrogate_mothers_by_pk;
  if (!row) return null;
  const profile_data = (row.profile_data && typeof row.profile_data === "object"
    ? row.profile_data
    : {}) as Record<string, unknown>;

  return {
    kind,
    id: String(row.id),
    email: row.email?.trim() ?? "",
    displayName: surrogateDisplayName(profile_data, row.email ?? undefined) || row.email || "",
    userId: row.user ? String(row.user.id) : null,
    userEmail: row.user?.email ?? null,
    profile_data,
    sections: GC_PROFILE_SECTIONS,
  };
}

export async function saveAdminEntityProfile(
  kind: EntityKind,
  idRaw: string,
  payload: { email?: string; profileFields: Record<string, string> },
): Promise<boolean> {
  if (!/^\d+$/u.test(idRaw)) return false;

  const existing = await fetchAdminEntityProfile(kind, idRaw);
  if (!existing) return false;

  const profile_data = mergeProfileDataFromForm(existing.profile_data, payload.profileFields);
  const set: Record<string, unknown> = { profile_data };

  if (typeof payload.email === "string") {
    set.email = payload.email.trim().toLowerCase();
  }

  const client = getClient();

  if (kind === "intended_parent") {
    const res = await client.execute<{ update_intended_parents_by_pk: { id: string | number } | null }>({
      query: UPDATE_IP,
      variables: { id: idRaw, set },
    });
    return Boolean(res.update_intended_parents_by_pk);
  }

  const res = await client.execute<{ update_surrogate_mothers_by_pk: { id: string | number } | null }>({
    query: UPDATE_SM,
    variables: { id: idRaw, set },
  });
  return Boolean(res.update_surrogate_mothers_by_pk);
}
