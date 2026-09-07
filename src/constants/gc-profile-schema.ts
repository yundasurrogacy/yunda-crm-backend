/**
 * 字段定义来源：修改/新版yunda-crm/CRM GC Profile.docx
 * + 2026-08-30 客户反馈调整
 * 全部写入 surrogate_mothers.profile_data。
 */
export type ProfileFieldOption = {
  value: string;
  labelEn: string;
  labelZh: string;
};

export type ProfileFieldDef = {
  key: string;
  labelEn: string;
  labelZh: string;
  /** 有选项时 UI 渲染为下拉，存 value */
  options?: ProfileFieldOption[];
};

export type ProfileSectionDef = {
  id: string;
  titleEn: string;
  titleZh: string;
  fields: ProfileFieldDef[];
};

const YES_NO: ProfileFieldOption[] = [
  { value: "Yes", labelEn: "Yes", labelZh: "是" },
  { value: "No", labelEn: "No", labelZh: "否" },
];

export const CHILD_SEX: ProfileFieldOption[] = [
  { value: "Female", labelEn: "Female", labelZh: "女" },
  { value: "Male", labelEn: "Male", labelZh: "男" },
  { value: "Other", labelEn: "Other / Unknown", labelZh: "其他 / 未知" },
];

export const DELIVERY_METHOD: ProfileFieldOption[] = [
  { value: "Vaginal", labelEn: "Vaginal", labelZh: "顺产" },
  { value: "C-Section", labelEn: "C-Section", labelZh: "剖腹产" },
  { value: "Other", labelEn: "Other", labelZh: "其他" },
];

const MATCHING_STATUS: ProfileFieldOption[] = [
  { value: "GC Matching", labelEn: "GC Matching", labelZh: "代孕妈妈匹配" },
  { value: "GC Pre-Screening", labelEn: "GC Pre-Screening", labelZh: "代孕妈妈初步筛选" },
  {
    value: "Contracts & Trust Pending",
    labelEn: "Contracts & Trust Pending",
    labelZh: "合同签署与信托设立",
  },
  { value: "Medical Screening", labelEn: "Medical Screening", labelZh: "医学筛查" },
  { value: "Legal Clearance", labelEn: "Legal Clearance", labelZh: "法律审核通过" },
];

const TRANSFER_STATUS: ProfileFieldOption[] = [
  { value: "IVF Cycle Started", labelEn: "IVF Cycle Started", labelZh: "试管婴儿周期开始" },
  { value: "Heartbeat Confirmed", labelEn: "Heartbeat Confirmed", labelZh: "胎心确认" },
  { value: "IVF Cycle Ended", labelEn: "IVF Cycle Ended", labelZh: "IVF 周期结束" },
  {
    value: "Third Trimester / Delivery Completed",
    labelEn: "Third Trimester / Delivery Completed",
    labelZh: "妊娠晚期（第三孕期）/ 分娩完成",
  },
];

export const GC_PROFILE_SECTIONS: ProfileSectionDef[] = [
  {
    id: "remark_overview",
    titleEn: "GC Remark Overview",
    titleZh: "GC 特点概况",
    fields: [
      { key: "previous_surrogacy", labelEn: "Previous Surrogacy", labelZh: "代孕史" },
      { key: "delivery_type", labelEn: "Delivery Type", labelZh: "分娩方式" },
      {
        key: "miscarriage_abortion_history",
        labelEn: "Miscarriage / Abortion History",
        labelZh: "流产堕胎历史",
      },
      { key: "support_system", labelEn: "Support System", labelZh: "支持系统" },
      { key: "initial_impression", labelEn: "Initial Impression", labelZh: "初印象" },
    ],
  },
  {
    id: "basic",
    titleEn: "GC Basic Information",
    titleZh: "基本信息",
    fields: [
      { key: "full_name", labelEn: "Full Name", labelZh: "姓名" },
      { key: "phone", labelEn: "Phone", labelZh: "电话" },
      { key: "email", labelEn: "Email", labelZh: "邮箱" },
      { key: "date_of_birth", labelEn: "Date of Birth", labelZh: "出生日期" },
      { key: "age", labelEn: "Age", labelZh: "年龄" },
      { key: "height", labelEn: "Height", labelZh: "身高" },
      { key: "weight", labelEn: "Weight", labelZh: "体重" },
      { key: "bmi", labelEn: "BMI", labelZh: "BMI" },
      { key: "ethnicity", labelEn: "Ethnicity", labelZh: "种族" },
      { key: "citizenship_status", labelEn: "Citizenship Status", labelZh: "国籍身份" },
      { key: "location", labelEn: "Location", labelZh: "居住地" },
      { key: "home_address", labelEn: "Home Address", labelZh: "家庭住址" },
      { key: "relationship_status", labelEn: "Relationship Status", labelZh: "感情状态" },
      { key: "educational_level", labelEn: "Educational Level", labelZh: "教育水平" },
      { key: "occupation", labelEn: "Occupation", labelZh: "职业" },
      { key: "base_compensation", labelEn: "Base Compensation", labelZh: "基础薪资" },
      { key: "menstrual_cycle_day_1", labelEn: "Menstrual Cycle Day 1", labelZh: "生理期第一天" },
      { key: "gc_emergency_contact", labelEn: "GC Emergency Contact", labelZh: "GC 紧急联系人" },
    ],
  },
  {
    id: "birth_history",
    titleEn: "Birth History",
    titleZh: "生产信息",
    fields: [
      {
        key: "birth_history_notes",
        labelEn: "Additional notes",
        labelZh: "其他备注",
      },
    ],
  },
  {
    id: "family",
    titleEn: "Family",
    titleZh: "家庭",
    fields: [
      { key: "partner_name", labelEn: "Partner Name", labelZh: "伴侣姓名" },
      { key: "partner_dob", labelEn: "Partner DOB", labelZh: "伴侣生日" },
      { key: "partner_contact", labelEn: "Partner Contact", labelZh: "伴侣联系方式" },
      { key: "children", labelEn: "Children", labelZh: "孩子数量与年龄" },
      { key: "family_support_system", labelEn: "Family Support System", labelZh: "家庭支持" },
      { key: "pets", labelEn: "Pets", labelZh: "宠物" },
    ],
  },
  {
    id: "preferences",
    titleEn: "Surrogacy Preferences",
    titleZh: "代孕偏好",
    fields: [
      {
        key: "contact_preference_with_ips",
        labelEn: "Contact Preference with IPs",
        labelZh: "与准父母沟通偏好",
      },
      {
        key: "open_to_lgbtq",
        labelEn: "Open to LGBTQ+",
        labelZh: "是否接受 LGBTQ+ 家庭",
        options: YES_NO,
      },
      {
        key: "open_to_international_ips",
        labelEn: "Open to International IPs",
        labelZh: "是否接受国际 IP",
        options: YES_NO,
      },
      {
        key: "open_to_twins",
        labelEn: "Open to Twins",
        labelZh: "是否接受双胎",
        options: YES_NO,
      },
      {
        key: "open_to_hiv_ips",
        labelEn: "Open to IPs with HIV",
        labelZh: "是否接受和 HIV 携带者准父母合作",
        options: YES_NO,
      },
      {
        key: "open_to_hepb_ips",
        labelEn: "Open to IPs with Hepatitis B",
        labelZh: "是否接受和 HepB 携带者准父母合作",
        options: YES_NO,
      },
    ],
  },
  {
    id: "internal",
    titleEn: "Internal Status",
    titleZh: "内部流程",
    fields: [
      { key: "medical_records_status", labelEn: "Medical Records Status", labelZh: "MR 状态" },
      {
        key: "background_check",
        labelEn: "Background Check",
        labelZh: "背景调查",
        options: YES_NO,
      },
      {
        key: "psych_clearance",
        labelEn: "Psych Clearance",
        labelZh: "心理批准",
        options: YES_NO,
      },
      { key: "potential_concerns", labelEn: "Potential Concerns", labelZh: "需关注点" },
      {
        key: "matching_status",
        labelEn: "Matching Status",
        labelZh: "匹配状态",
        options: MATCHING_STATUS,
      },
      {
        key: "transfer_status",
        labelEn: "Transfer Status",
        labelZh: "移植状态",
        options: TRANSFER_STATUS,
      },
    ],
  },
];

/** 旧字段 key → 新 key（读档时兼容） */
export const GC_PROFILE_LEGACY_KEY_MAP: Record<string, string> = {
  preterm_history: "miscarriage_abortion_history",
  ob_clearance: "background_check",
};
