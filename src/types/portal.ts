export type PortalId = "case_manager" | "intended_parent" | "surrogate_mother";

export interface CrmSession {
  userId: string;
  email: string;
  /** users.role — schema: user | admin | operator */
  role: string;
  /** 业务端口：由 users 关联推导；当前开发占位由登录接口写入 */
  portals: PortalId[];
  activePortal: PortalId | null;
}
