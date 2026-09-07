import { AM_STAGE_FIELD_GROUPS } from "@/constants/am-stage-field-groups";
import type { CanonicalCaseStage } from "@/constants/case-stages";
import { type AmWorkspacePayload } from "@/lib/case-manager/am-workspace-model";
import { surrogateDisplayName } from "@/lib/case-manager/display-names";
import type { AmCaseDetail } from "@/lib/case-manager/fetch-case-detail";
import { GC_PROFILE_SECTIONS } from "@/constants/gc-profile-schema";
import { IP_PROFILE_SECTIONS } from "@/constants/ip-profile-schema";
import type { ProfileSectionDef } from "@/constants/gc-profile-schema";

/** 门户不可见的 GC profile 分区（内部流程 / CM 备注） */
const PARTY_HIDDEN_GC_SECTION_IDS = new Set(["internal", "remark_overview"]);

/**
 * 对客（尤其 IP）默认隐藏的 GC 联系方式字段。
 * 孕妈自助资料页仍用完整可见分区，不经过此集合。
 */
export const PARTY_HIDDEN_GC_CONTACT_KEYS = new Set([
  "phone",
  "email",
  "home_address",
  "partner_contact",
  "gc_emergency_contact",
]);

/** 客户端不可见的 IP profile 字段（管理端保留） */
const PARTY_HIDDEN_IP_FIELD_KEYS = new Set(["referral_source"]);

function stripHiddenGcProfileKeys(profileData: unknown): unknown {
  if (!profileData || typeof profileData !== "object" || Array.isArray(profileData)) {
    return profileData;
  }
  const hiddenKeys = new Set<string>(PARTY_HIDDEN_GC_CONTACT_KEYS);
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

function stripInternalOnlyStageData(payload: AmWorkspacePayload): AmWorkspacePayload {
  const hidden = new Set<string>();
  for (const group of AM_STAGE_FIELD_GROUPS) {
    for (const field of group.fields) {
      if (field.internalOnly) hidden.add(field.key);
    }
  }
  const byStage: AmWorkspacePayload["byStage"] = {};
  for (const [stage, row] of Object.entries(payload.byStage)) {
    if (!row) continue;
    const next = { ...row };
    for (const key of hidden) delete next[key];
    byStage[stage as CanonicalCaseStage] = next;
  }
  return { v: 1, byStage };
}

/**
 * IP/GC 门户详情脱敏：
 * - 阶段字段对客可见，但去掉 internalOnly（心理医生姓名/邮箱）
 * - 去掉 GC 内部备注分区字段
 * - 去掉 GC 电话/邮箱等联系方式（对客默认隐藏）
 * - 去掉 IP referral_source
 * - 案例卡片副标题不再回退到孕妈邮箱
 */
export function redactCaseDetailForParty(detail: AmCaseDetail): AmCaseDetail {
  const gcProfile = stripHiddenGcProfileKeys(detail.surrogate.profile_data);
  return {
    ...detail,
    stage_data: stripInternalOnlyStageData(detail.stage_data),
    surrogate: {
      ...detail.surrogate,
      email: null,
      /** 禁止用邮箱回退，避免对客详情副标题泄露联系方式 */
      displayName: surrogateDisplayName(gcProfile) || "",
      profile_data: gcProfile,
    },
    intended_parent: {
      ...detail.intended_parent,
      profile_data: stripHiddenIpProfileKeys(detail.intended_parent.profile_data),
    },
  };
}

/** 孕妈自助编辑：去掉内部分区，保留本人联系方式 */
export function partyVisibleGcProfileSections() {
  return GC_PROFILE_SECTIONS.filter((s) => !PARTY_HIDDEN_GC_SECTION_IDS.has(s.id));
}

/** 案例详情对客展示 GC：再隐藏电话/邮箱等联系字段 */
export function partyVisibleGcProfileSectionsForClient(): ProfileSectionDef[] {
  return partyVisibleGcProfileSections()
    .map((section) => ({
      ...section,
      fields: section.fields.filter((f) => !PARTY_HIDDEN_GC_CONTACT_KEYS.has(f.key)),
    }))
    .filter((section) => section.fields.length > 0);
}

/** 门户 IP 档案：去掉推荐来源等仅管理端字段 */
export function partyVisibleIpProfileSections(): ProfileSectionDef[] {
  return IP_PROFILE_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.filter((f) => !PARTY_HIDDEN_IP_FIELD_KEYS.has(f.key)),
  })).filter((section) => section.fields.length > 0);
}
