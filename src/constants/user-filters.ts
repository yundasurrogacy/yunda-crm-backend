/**
 * 「账号管理」列表的筛选维度：角色 + 绑定状态。
 *
 * 注意与 record-filter.ts 的区别：users 表没有 deleted_at，
 * 所以账号没有「正常 / 已删除」三态，这里只做角色与绑定状态两个维度。
 */

/** 角色：全部 / 管理员 / 普通用户 / 运营 */
export const USER_ROLE_FILTERS = ["all", "admin", "user", "operator"] as const;
export type UserRoleFilter = (typeof USER_ROLE_FILTERS)[number];
export const DEFAULT_USER_ROLE_FILTER: UserRoleFilter = "all";

/**
 * 绑定状态：全部 / 未绑定 / 绑案例经理 / 绑准父母 / 绑代孕母。
 * 一个账号可同时绑定多种身份（取并集语义），故用「绑 X」而非「仅绑 X」。
 */
export const USER_BINDING_FILTERS = [
  "all",
  "unbound",
  "case_manager",
  "intended_parent",
  "surrogate_mother",
] as const;
export type UserBindingFilter = (typeof USER_BINDING_FILTERS)[number];
export const DEFAULT_USER_BINDING_FILTER: UserBindingFilter = "all";

/** 绑定状态筛选对应到 users 上的对象关系名 */
export const BINDING_RELATION: Record<
  Exclude<UserBindingFilter, "all" | "unbound">,
  "case_manager" | "intended_parent" | "surrogate_mother"
> = {
  case_manager: "case_manager",
  intended_parent: "intended_parent",
  surrogate_mother: "surrogate_mother",
};

function parseFrom<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const v = raw?.trim().toLowerCase();
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function parseUserRoleFilter(raw: string | null | undefined): UserRoleFilter {
  return parseFrom(raw, USER_ROLE_FILTERS, DEFAULT_USER_ROLE_FILTER);
}

export function parseUserBindingFilter(raw: string | null | undefined): UserBindingFilter {
  return parseFrom(raw, USER_BINDING_FILTERS, DEFAULT_USER_BINDING_FILTER);
}

/** 写入 URL 用的值；等于默认值时返回 null（不写参数，保持链接干净） */
export function roleFilterParam(filter: UserRoleFilter): string | null {
  return filter === DEFAULT_USER_ROLE_FILTER ? null : filter;
}

export function bindingFilterParam(filter: UserBindingFilter): string | null {
  return filter === DEFAULT_USER_BINDING_FILTER ? null : filter;
}

/** i18n key（portal 命名空间 admin_users 下） */
export const USER_ROLE_LABEL_KEY: Record<UserRoleFilter, string> = {
  all: "admin_users.filter_role_all",
  admin: "admin_users.role_admin",
  user: "admin_users.role_user",
  operator: "admin_users.role_operator",
};

export const USER_BINDING_LABEL_KEY: Record<UserBindingFilter, string> = {
  all: "admin_users.filter_binding_all",
  unbound: "admin_users.filter_binding_unbound",
  case_manager: "admin_users.filter_binding_cm",
  intended_parent: "admin_users.filter_binding_ip",
  surrogate_mother: "admin_users.filter_binding_sm",
};
