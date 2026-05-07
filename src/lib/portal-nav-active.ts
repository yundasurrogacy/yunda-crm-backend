/**
 * 判断侧栏某链接是否为「当前页」，用于高亮。
 * - `/admin` 仅精确匹配，避免吞掉 `/admin/cases` 等子路径。
 * - 案例经理：`/case_manager/cases` 与工作台同属第一项。
 */
export function isPortalNavActive(pathname: string, href: string): boolean {
  const p = (pathname || "/").replace(/\/$/, "") || "/";
  const h = href.replace(/\/$/, "") || "/";

  if (h === "/admin") return p === "/admin";

  if (h === "/case_manager") {
    return p === "/case_manager" || p.startsWith("/case_manager/cases");
  }
  if (h === "/case_manager/my-cases") {
    return p.startsWith("/case_manager/my-cases");
  }

  if (h === "/intended_parent") return p === "/intended_parent" || p.startsWith("/intended_parent/");
  if (h === "/surrogate_mother") return p === "/surrogate_mother" || p.startsWith("/surrogate_mother/");

  return p === h || p.startsWith(`${h}/`);
}
