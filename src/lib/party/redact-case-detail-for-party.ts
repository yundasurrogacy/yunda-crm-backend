import type { CanonicalCaseStage } from "@/constants/case-stages";
import { type AmWorkspacePayload } from "@/lib/case-manager/am-workspace-model";
import { surrogateDisplayName } from "@/lib/case-manager/display-names";
import type { AmCaseDetail } from "@/lib/case-manager/fetch-case-detail";
import { GC_PROFILE_SECTIONS, type ProfileSectionDef } from "@/constants/gc-profile-schema";
import {
  PARTY_HIDDEN_GC_SECTION_IDS,
  PARTY_HIDDEN_IP_FIELD_KEYS,
  clientViewGcProfileSections,
  clientViewOfGcProfileData,
  gcViewIpProfileSections,
  ipViewIpProfileSections,
  ipViewOfIpProfileData,
  isStageFieldVisibleToParty,
  type PartyViewer,
} from "@/constants/portal-exposure";

/**
 * 对客（准父母 / 代孕母）门户脱敏。
 *
 * 可见性规则集中在 `@/constants/portal-exposure`（显式白名单 + 默认不开放），
 * 本文件只负责「把规则应用到案例详情」。注意 IP 端与 GC 端共用同一个案例页组件，
 * 所以这里必须按 `viewer` 分流，否则会误伤（例如 GC 看自己档案被当成对客视角裁剪）。
 */

/** 阶段字段脱敏：只保留对客白名单内的字段（未列入的一律丢弃） */
function stripStageDataToWhitelist(payload: AmWorkspacePayload): AmWorkspacePayload {
  const byStage: AmWorkspacePayload["byStage"] = {};
  for (const [stage, row] of Object.entries(payload.byStage)) {
    if (!row) continue;
    const next = { ...row };
    for (const key of Object.keys(next)) {
      if (!isStageFieldVisibleToParty(stage, key)) delete next[key];
    }
    byStage[stage as CanonicalCaseStage] = next;
  }
  return { v: 1, byStage };
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
 * 门户案例详情脱敏（按 viewer 分流）：
 * - 阶段字段：只保留 `PARTY_VISIBLE_STAGE_FIELDS` 白名单（IP/GC 共用同一套对客清单）
 * - 代孕母档案：去内部分区与联系方式，保留完整资料（客户已确认要保留，不做收窄）
 * - IP 视角的准父母档案：只留下单清单里的分区（不含项目偏好），避免报文带出未开放数据
 * - 无论哪种视角，都不回退到邮箱，避免泄露联系方式
 */
export function redactCaseDetailForParty(
  detail: AmCaseDetail,
  viewer: PartyViewer,
): AmCaseDetail {
  const gcProfile = clientViewOfGcProfileData(detail.surrogate.profile_data);
  const ipProfile =
    viewer === "intended_parent"
      ? ipViewOfIpProfileData(detail.intended_parent.profile_data)
      : stripHiddenIpProfileKeys(detail.intended_parent.profile_data);

  return {
    ...detail,
    stage_data: stripStageDataToWhitelist(detail.stage_data),
    surrogate: {
      ...detail.surrogate,
      email: null,
      /** 禁止用邮箱回退，避免对客详情副标题泄露联系方式 */
      displayName: surrogateDisplayName(gcProfile) || "",
      profile_data: gcProfile,
    },
    intended_parent: {
      ...detail.intended_parent,
      profile_data: ipProfile,
    },
  };
}

/** 案例页代孕母档案分区（IP 与 GC 本人一致） */
export function partyGcProfileSections(): ProfileSectionDef[] {
  return clientViewGcProfileSections();
}

/** 案例页准父母档案分区：IP 与 GC 视角不同 */
export function partyIpProfileSectionsFor(viewer: PartyViewer): ProfileSectionDef[] {
  return viewer === "intended_parent"
    ? ipViewIpProfileSections()
    : gcViewIpProfileSections();
}

/** 孕妈自助资料页：去掉内部分区，保留本人联系方式 */
export function partyVisibleGcProfileSections() {
  return GC_PROFILE_SECTIONS.filter((s) => !PARTY_HIDDEN_GC_SECTION_IDS.has(s.id));
}

export type { PartyViewer };
