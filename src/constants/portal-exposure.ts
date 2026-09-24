import { AM_STAGE_FIELD_GROUPS } from "@/constants/am-stage-field-groups";
import {
  normalizeCanonicalCaseStage,
  type CanonicalCaseStage,
} from "@/constants/case-stages";
import {
  GC_PROFILE_SECTIONS,
  type ProfileSectionDef,
} from "@/constants/gc-profile-schema";
import { IP_PROFILE_SECTIONS } from "@/constants/ip-profile-schema";

/**
 * 门户（准父母端 / 代孕母端）字段可见性 —— 单一真源（Single Source of Truth）。
 *
 * 设计：**显式白名单 + 默认不开放（fail-closed）**
 * - 阶段字段只有列在 `PARTY_VISIBLE_STAGE_FIELDS` 里，门户才看得到；
 *   没列的字段一律按内部处理 —— 以后新增字段默认不会外泄，必须显式决定。
 * - 需要调整「对客开放 / 仅内部」时只改本文件，不要在组件或 API 里散落判断。
 * - `PARTY_INTERNAL_STAGE_FIELDS` 明确记录「决定不开放」的字段和原因，便于审计；
 *   `getUnclassifiedStageFieldKeys()` 会指出既没开放、也没写原因的字段。
 *
 * 清单来源：`修改/新版yunda-crm/crm修改/2026-09-12/CRM IP 端口.xlsx`
 * （客户确认的 IP 端字段清单）。客户明确说明该清单不完整，缺项已按常识补齐，
 * 每处补充都在注释里标了 `补`。
 */

export type PartyViewer = "intended_parent" | "surrogate_mother";

/** 阶段字段：门户可见白名单（未列入 = 内部） */
export const PARTY_VISIBLE_STAGE_FIELDS: Record<CanonicalCaseStage, readonly string[]> = {
  "GC Matching": [
    "case_manager",
    "gc_coordinator",
    "matching_coordinator",
    "monitoring_clinic_name",
    "monitoring_clinic_phone",
    "monitoring_clinic_email",
    "monitoring_clinic_location",
    "monitoring_clinic_fax",
    /** 补：客户表格「Anticipated Day 1 / 预计例假第一天」 */
    "anticipated_day_1",
  ],
  "GC Pre-Screening": [
    "prescreening_submission_date",
    "medical_records_approval_date",
    "current_progress",
  ],
  "Retainer & Escrow Pending": [
    "escrow_platform",
    "escrow_email",
    "initial_trust_funding",
    "initial_trust_funding_received_date",
    "second_trust_funding",
    "second_trust_funding_received_date",
    "third_trust_funding",
    "third_trust_funding_received_date",
    "additional_custom_payment",
  ],
  "Medical Screening": [
    "medical_screening_appointment_date",
    "psychological_clearance_complete",
    "medical_clearance_complete",
  ],
  "Legal Clearance": [
    "ip_attorney",
    "ip_attorney_email",
    "gc_review_attorney",
    "gc_review_attorney_email",
    "notary_date",
    "legal_clearance_complete",
  ],
  "IVF Cycle Started": [
    "monitoring_clinic_name",
    "monitoring_clinic_phone",
    "monitoring_clinic_email",
    "monitoring_clinic_location",
    "transfer_date",
    "hcg_1",
    "hcg_1_date",
    "hcg_2",
    "hcg_2_date",
    "ultrasound_1",
    "ultrasound_1_date",
    "ultrasound_2",
    "ultrasound_2_date",
  ],
  "Heartbeat Confirmed": [
    "heartbeat_confirmed_date",
    "health_insurance_carrier",
    "health_insurance_plan",
    "health_insurance_premium",
    "life_insurance_carrier",
    "life_insurance_plan",
    "life_insurance_premium",
  ],
  "IVF Graduation": [
    "ivf_graduated_date",
    "pbo_start_date",
    "first_ob_date",
    "nt_date",
    "nipt_date",
    "anatomy_scan_date",
  ],
  "Third Trimester": [
    "glucose_test_date",
    "group_b_strep",
    "expected_delivery_date",
    "delivery_hospital_name",
    "ob/gyn_physician_name",
    "ob/gyn_clinic",
    "ob/gyn_phone",
    "ob/gyn_email",
    "hospital_social_worker_pbo",
    "social_worker_phone",
    "social_worker_email",
  ],
  /** 补：客户表格漏了这一整个阶段，但它是终态、客户必然要看宝宝信息 */
  "Delivery Completed": [
    "pregnancy_type",
    "delivery_date",
    "delivery_method",
    "gestational_age_at_delivery",
    "birth_weight",
    "sex_gender",
    "complications_if_any",
    "baby2_birth_weight",
    "baby2_sex_gender",
    "baby2_complications_if_any",
  ],
};

/** 阶段字段：明确不开放的字段及原因（用于审计与「未分类」检测） */
export const PARTY_INTERNAL_STAGE_FIELDS: ReadonlyArray<{
  stage: CanonicalCaseStage;
  key: string;
  reason: string;
}> = [
  {
    stage: "Medical Screening",
    key: "psychologist",
    reason: "心理医生属于内部资源，不对客户披露",
  },
  {
    stage: "Medical Screening",
    key: "psychologist_email",
    reason: "心理医生属于内部资源，不对客户披露",
  },
  {
    stage: "Heartbeat Confirmed",
    key: "health_insurance_id_number",
    reason: "保单号属敏感信息，客户清单未列",
  },
  {
    stage: "Heartbeat Confirmed",
    key: "life_insurance_id_number",
    reason: "保单号属敏感信息，客户清单未列",
  },
];

const VISIBLE_STAGE_FIELD_SETS: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.entries(PARTY_VISIBLE_STAGE_FIELDS).map(([stage, keys]) => [
    stage,
    new Set<string>(keys),
  ]),
);

/** 该阶段字段是否对门户开放（默认 false = 不开放） */
export function isStageFieldVisibleToParty(stage: string, key: string): boolean {
  const canonical = normalizeCanonicalCaseStage(stage) ?? stage;
  return VISIBLE_STAGE_FIELD_SETS.get(canonical)?.has(key) ?? false;
}

/**
 * 既没开放、也没写明「不开放」原因的阶段字段。
 * 非空说明有人加了字段却忘了做可见性决策（此时按内部处理，不会外泄）。
 */
export function getUnclassifiedStageFieldKeys(): Array<{ stage: string; key: string }> {
  const internal = new Set(
    PARTY_INTERNAL_STAGE_FIELDS.map((f) => `${f.stage}\u0000${f.key}`),
  );
  const gaps: Array<{ stage: string; key: string }> = [];
  for (const group of AM_STAGE_FIELD_GROUPS) {
    const canonical = normalizeCanonicalCaseStage(group.stage) ?? group.stage;
    const visible = VISIBLE_STAGE_FIELD_SETS.get(canonical);
    for (const field of group.fields) {
      if (visible?.has(field.key)) continue;
      if (internal.has(`${canonical}\u0000${field.key}`)) continue;
      /** 历史上用 `internalOnly` 标记的字段也算已决策 */
      if (field.internalOnly) continue;
      gaps.push({ stage: group.stage, key: field.key });
    }
  }
  return gaps;
}

if (process.env.NODE_ENV === "development") {
  const gaps = getUnclassifiedStageFieldKeys();
  if (gaps.length > 0) {
    console.warn(
      "[portal-exposure] 以下阶段字段未做可见性决策，已按「不对客户开放」处理：",
      gaps,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  档案分区（profile_data）                                                    */
/* -------------------------------------------------------------------------- */

/** 客户端不可见的 IP 档案字段（管理端保留） */
export const PARTY_HIDDEN_IP_FIELD_KEYS: ReadonlySet<string> = new Set([
  "referral_source",
]);

/** 对客隐藏的 GC 联系方式字段（孕妈自助资料页不经过此集合） */
export const PARTY_HIDDEN_GC_CONTACT_KEYS: ReadonlySet<string> = new Set([
  "phone",
  "email",
  "home_address",
  "partner_contact",
  "gc_emergency_contact",
]);

/** 门户不可见的 GC 档案分区（内部流程 / CM 备注） */
export const PARTY_HIDDEN_GC_SECTION_IDS: ReadonlySet<string> = new Set([
  "internal",
  "remark_overview",
]);

/**
 * 对客（IP 与 GC 本人）看代孕母档案时保留的分区与字段。
 *
 * 说明：客户表格虽只写了「GC Basic Information 的姓名 + 出生日期」，但经确认，
 * IP 端应当保留完整的代孕母资料（家庭 / 偏好 / 生产史 / 身体数据），
 * 因此这里沿用「去内部分区 + 去联系方式」的规则，而不是收窄到两个字段。
 */

/**
 * IP 视角看准父母档案：客户表格列出的分区。
 * 「项目偏好（program）」未列入 → 不展示。
 */
export const IP_VIEW_OF_IP_PROFILE_SECTION_IDS: readonly string[] = [
  "ip1",
  "ip2",
  "ivf_clinic",
  "embryo",
];

function filterSectionFields(
  sections: ProfileSectionDef[],
  hidden: ReadonlySet<string>,
): ProfileSectionDef[] {
  return sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter((f) => !hidden.has(f.key)),
    }))
    .filter((section) => section.fields.length > 0);
}

function filterSectionsById(
  sections: ProfileSectionDef[],
  allowedIds: readonly string[],
): ProfileSectionDef[] {
  const allowed = new Set(allowedIds);
  return sections.filter((section) => allowed.has(section.id));
}

/** 对客视角的代孕母档案分区：去内部/备注分区与联系方式（IP 与 GC 本人一致） */
export function clientViewGcProfileSections(): ProfileSectionDef[] {
  return filterSectionFields(
    GC_PROFILE_SECTIONS.filter((s) => !PARTY_HIDDEN_GC_SECTION_IDS.has(s.id)),
    PARTY_HIDDEN_GC_CONTACT_KEYS,
  );
}

/** IP 视角看准父母档案分区（客户清单：准父母 1/2 + 服务提供方 + 胚胎捐赠，不含项目偏好） */
export function ipViewIpProfileSections(): ProfileSectionDef[] {
  return filterSectionFields(
    filterSectionsById(IP_PROFILE_SECTIONS, IP_VIEW_OF_IP_PROFILE_SECTION_IDS),
    PARTY_HIDDEN_IP_FIELD_KEYS,
  );
}

/** 对客视角看准父母档案分区 */
export function gcViewIpProfileSections(): ProfileSectionDef[] {
  return filterSectionFields(IP_PROFILE_SECTIONS, PARTY_HIDDEN_IP_FIELD_KEYS);
}

/**
 * 把 GC profile_data 裁剪成对客可见字段（去掉内部分区字段与联系方式；照片保留）。
 * 注意：这里是「去掉明确隐藏项」，与阶段字段的 fail-closed 白名单策略不同 —— GC 档案
 * 属于资料展示，客户已确认要保留完整资料。
 */
export function clientViewOfGcProfileData(profileData: unknown): unknown {
  if (!profileData || typeof profileData !== "object" || Array.isArray(profileData)) {
    return profileData;
  }
  const hidden = new Set<string>(PARTY_HIDDEN_GC_CONTACT_KEYS);
  for (const section of GC_PROFILE_SECTIONS) {
    if (!PARTY_HIDDEN_GC_SECTION_IDS.has(section.id)) continue;
    for (const field of section.fields) hidden.add(field.key);
  }
  const source = profileData as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!hidden.has(key)) out[key] = value;
  }
  return out;
}

/** 把 IP profile_data 裁剪成 IP 视角可见的字段（同样是白名单，避免报文里带出未开放数据） */
export function ipViewOfIpProfileData(profileData: unknown): unknown {
  if (!profileData || typeof profileData !== "object" || Array.isArray(profileData)) {
    return profileData;
  }
  const source = profileData as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const section of ipViewIpProfileSections()) {
    for (const field of section.fields) {
      if (field.key in source) out[field.key] = source[field.key];
    }
  }
  return out;
}
