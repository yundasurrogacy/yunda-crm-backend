export const BIRTH_HISTORY_ENTRIES_KEY = "birth_history_entries";

export const LEGACY_BIRTH_KEYS = [
  "birth_delivery_date",
  "birth_gestational_weeks",
  "birth_weight",
  "birth_child_sex",
  "birth_delivery_method",
] as const;

export type BirthHistoryEntry = {
  delivery_date: string;
  gestational_weeks: string;
  weight: string;
  child_sex: string;
  delivery_method: string;
};

export function emptyBirthHistoryEntry(): BirthHistoryEntry {
  return {
    delivery_date: "",
    gestational_weeks: "",
    weight: "",
    child_sex: "",
    delivery_method: "",
  };
}

function asEntry(raw: unknown): BirthHistoryEntry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  return {
    delivery_date: String(o.delivery_date ?? o.birth_delivery_date ?? "").trim(),
    gestational_weeks: String(o.gestational_weeks ?? o.birth_gestational_weeks ?? "").trim(),
    weight: String(o.weight ?? o.birth_weight ?? "").trim(),
    child_sex: String(o.child_sex ?? o.birth_child_sex ?? "").trim(),
    delivery_method: String(o.delivery_method ?? o.birth_delivery_method ?? "").trim(),
  };
}

function legacyEntryFromProfile(data: Record<string, unknown>): BirthHistoryEntry | null {
  const entry: BirthHistoryEntry = {
    delivery_date: String(data.birth_delivery_date ?? "").trim(),
    gestational_weeks: String(data.birth_gestational_weeks ?? "").trim(),
    weight: String(data.birth_weight ?? "").trim(),
    child_sex: String(data.birth_child_sex ?? "").trim(),
    delivery_method: String(data.birth_delivery_method ?? "").trim(),
  };
  return Object.values(entry).some(Boolean) ? entry : null;
}

/** 读档：新数组优先；否则把旧的单条扁平字段迁成第一条 */
export function readBirthHistoryEntries(profileData: unknown): BirthHistoryEntry[] {
  if (!profileData || typeof profileData !== "object" || Array.isArray(profileData)) return [];
  const data = profileData as Record<string, unknown>;
  const raw = data[BIRTH_HISTORY_ENTRIES_KEY];
  if (Array.isArray(raw)) {
    return raw.map(asEntry).filter((x): x is BirthHistoryEntry => x != null);
  }
  const legacy = legacyEntryFromProfile(data);
  return legacy ? [legacy] : [];
}

export function writeBirthHistoryIntoProfile(
  profileData: Record<string, unknown>,
  entries: BirthHistoryEntry[],
): void {
  const cleaned = entries
    .map((e) => ({
      delivery_date: e.delivery_date.trim(),
      gestational_weeks: e.gestational_weeks.trim(),
      weight: e.weight.trim(),
      child_sex: e.child_sex.trim(),
      delivery_method: e.delivery_method.trim(),
    }))
    .filter((e) => Object.values(e).some(Boolean));
  if (cleaned.length) profileData[BIRTH_HISTORY_ENTRIES_KEY] = cleaned;
  else delete profileData[BIRTH_HISTORY_ENTRIES_KEY];
  for (const key of LEGACY_BIRTH_KEYS) delete profileData[key];
}
