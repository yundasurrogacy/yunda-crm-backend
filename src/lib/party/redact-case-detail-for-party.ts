import { emptyWorkspace, type AmWorkspacePayload } from "@/lib/case-manager/am-workspace-model";
import type { AmCaseDetail } from "@/lib/case-manager/fetch-case-detail";
import { GC_PROFILE_SECTIONS } from "@/constants/gc-profile-schema";
import { IP_PROFILE_SECTIONS } from "@/constants/ip-profile-schema";
import type { ProfileSectionDef } from "@/constants/gc-profile-schema";

/** 门户不可见的 GC profile 分区（内部流程 / CM 备注） */
const PARTY_HIDDEN_GC_SECTION_IDS = new Set(["internal", "remark_overview"]);

/** 客户端不可见的 IP profile 字段（管理端保留） */
const PARTY_HIDDEN_IP_FIELD_KEYS = new Set(["referral_source"]);

function stripHiddenGcProfileKeys(profileData: unknown): unknown {
  if (!profileData || typeof profileData !== "object" || Array.isArray(profileData)) {
    return profileData;
  }
  const hiddenKeys = new Set<string>();
  for (const section of GC_PROFILE_SECTIONS) {
    if (!PARTY_HIDDEN_GC_SECTION_IDS.has(section.id)) continue;
    for (const f of section.fields) hiddenKeys.add(f.key);
  }
  if (hiddenKeys.size === 0) return profileData;
  const next: Record<string, unknown> = { ...(profileData as Record<string, unknown>) };
  for (const key of hiddenKeys) delete next[key];
  return next;
}

function stripHiddenIpProfileKeys(profileData: unknown): unknown {
  if (!profileData || typeof profileData !== "object" || Array.isArray(profileData)) {
    return profileData;
  }
  const next: Record<string, unknown> = { ...(profileData as Record<string, unknown>) };
  for (const key of PARTY_HIDDEN_IP_FIELD_KEYS) delete next[key];
  return next;
}

/**
 * IP/GC 门户详情脱敏：
 * - 不返回阶段表单字段（含心理师姓名/邮箱等 internalOnly 字段）
 * - 去掉 GC 内部备注分区字段
 * - 去掉 IP referral_source
 */
export function redactCaseDetailForParty(detail: AmCaseDetail): AmCaseDetail {
  const emptyStages: AmWorkspacePayload = emptyWorkspace();
  return {
    ...detail,
    stage_data: emptyStages,
    surrogate: {
      ...detail.surrogate,
      profile_data: stripHiddenGcProfileKeys(detail.surrogate.profile_data),
    },
    intended_parent: {
      ...detail.intended_parent,
      profile_data: stripHiddenIpProfileKeys(detail.intended_parent.profile_data),
    },
  };
}

/** 门户档案卡片：去掉内部分区 */
export function partyVisibleGcProfileSections() {
  return GC_PROFILE_SECTIONS.filter((s) => !PARTY_HIDDEN_GC_SECTION_IDS.has(s.id));
}

/** 门户 IP 档案：去掉推荐来源等仅管理端字段 */
export function partyVisibleIpProfileSections(): ProfileSectionDef[] {
  return IP_PROFILE_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.filter((f) => !PARTY_HIDDEN_IP_FIELD_KEYS.has(f.key)),
  })).filter((section) => section.fields.length > 0);
}
