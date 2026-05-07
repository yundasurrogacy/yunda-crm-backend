export type PortalNavItem = { readonly href: string; readonly labelKey: string };

/** 工作台 = 阶段总览 + 按阶段看列表；我的案例 = 负责的全部案例一览（不按阶段拆分） */
export const caseManagerNav = [
  { href: "/case_manager", labelKey: "nav.cm.dashboard" },
  { href: "/case_manager/my-cases", labelKey: "nav.cm.my_cases" },
] as const satisfies readonly PortalNavItem[];

export const intendedParentNav = [{ href: "/intended_parent", labelKey: "nav.ip.home" }] as const satisfies readonly PortalNavItem[];

export const surrogateMotherNav = [{ href: "/surrogate_mother", labelKey: "nav.sm.home" }] as const satisfies readonly PortalNavItem[];

/** 管理端：三类业务列表（在各自行绑定登录用户）；新建登录账号见「账号管理」 */
export const adminNav = [
  { href: "/admin", labelKey: "nav.admin.dashboard" },
  { href: "/admin/cases", labelKey: "nav.admin.cases" },
  { href: "/admin/users", labelKey: "nav.admin.users" },
  { href: "/admin/accounts/case-managers", labelKey: "nav.admin.case_managers" },
  { href: "/admin/accounts/intended-parents", labelKey: "nav.admin.intended_parents" },
  { href: "/admin/accounts/surrogates", labelKey: "nav.admin.surrogates" },
] as const satisfies readonly PortalNavItem[];
