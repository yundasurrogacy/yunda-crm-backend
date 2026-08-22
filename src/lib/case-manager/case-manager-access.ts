/**
 * 案例经理访问条件：
 * - 主 FK `cases.case_manager_case_managers`
 * - M2M `case_case_managers`
 * - 可选：创建人 / 主 CM 的 user 绑定
 */
export function caseManagerAccessOrClauses(
  resolvedCaseManagerEntityId: string | null | undefined,
  sessionUserId?: string,
): Record<string, unknown>[] {
  const accessOr: Record<string, unknown>[] = [];
  const cmId = resolvedCaseManagerEntityId?.trim();
  const uid = sessionUserId?.trim();
  if (cmId) {
    accessOr.push({ case_manager_case_managers: { _eq: cmId } });
    accessOr.push({
      case_case_managers: { case_manager_case_managers: { _eq: cmId } },
    });
  }
  if (uid) {
    accessOr.push({ created_by: { _eq: uid } });
    accessOr.push({ case_manager: { user_users: { _eq: uid } } });
  }
  return accessOr;
}

/** 筛选「案例经理包含该 ID」（主 FK 或 M2M） */
export function caseManagerFilterClause(caseManagerId: string): Record<string, unknown> {
  return {
    _or: [
      { case_manager_case_managers: { _eq: caseManagerId } },
      { case_case_managers: { case_manager_case_managers: { _eq: caseManagerId } } },
    ],
  };
}
