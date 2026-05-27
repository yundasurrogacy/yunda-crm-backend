/**
 * 字段定义来源：修改/新版yunda-crm/CRM GC Profile.docx
 * 全部写入 surrogate_mothers.profile_data。
 */
export type ProfileFieldDef = {
  key: string;
  labelEn: string;
  labelZh: string;
};

export type ProfileSectionDef = {
  id: string;
  titleEn: string;
  titleZh: string;
  fields: ProfileFieldDef[];
};

export const GC_PROFILE_SECTIONS: ProfileSectionDef[] = [
  {
    id: "remark_overview",
    titleEn: "GC Remark Overview",
    titleZh: "GC 特点概况",
    fields: [
      { key: "previous_surrogacy", labelEn: "Previous Surrogacy", labelZh: "代孕史" },
      { key: "delivery_type", labelEn: "Delivery Type", labelZh: "分娩方式" },
      { key: "preterm_history", labelEn: "Preterm History", labelZh: "早产史" },
      { key: "support_system", labelEn: "Support System", labelZh: "支持系统" },
      { key: "schedule_flexibility", labelEn: "Schedule Flexibility", labelZh: "时间灵活度" },
      { key: "match_readiness", labelEn: "Match Readiness", labelZh: "匹配准备度" },
      { key: "response_speed", labelEn: "Response Speed", labelZh: "回复速度" },
      { key: "communication_quality", labelEn: "Communication Quality", labelZh: "交流质量" },
      { key: "initial_impression", labelEn: "Initial Impression", labelZh: "初印象" },
      { key: "estimated_matchability", labelEn: "Estimated Matchability", labelZh: "预估匹配率" },
      { key: "priority_level", labelEn: "Priority Level", labelZh: "优先级" },
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
      { key: "availability_to_proceed", labelEn: "Availability to Proceed", labelZh: "开始时间" },
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
      { key: "contact_preference_with_ips", labelEn: "Contact Preference with IPs", labelZh: "与准父母沟通偏好" },
      { key: "open_to_lgbtq", labelEn: "Open to LGBTQ+", labelZh: "是否接受 LGBTQ+ 家庭" },
      { key: "open_to_international_ips", labelEn: "Open to International IPs", labelZh: "是否接受国际 IP" },
      { key: "open_to_twins", labelEn: "Open to Twins", labelZh: "是否接受双胎" },
    ],
  },
  {
    id: "internal",
    titleEn: "Internal Status",
    titleZh: "内部流程",
    fields: [
      { key: "medical_records_status", labelEn: "Medical Records Status", labelZh: "MR 状态" },
      { key: "ob_clearance", labelEn: "OB Clearance", labelZh: "OB 批准" },
      { key: "psych_clearance", labelEn: "Psych Clearance", labelZh: "心理批准" },
      { key: "potential_concerns", labelEn: "Potential Concerns", labelZh: "需关注点" },
      { key: "matching_status", labelEn: "Matching Status", labelZh: "匹配状态" },
      { key: "transfer_status", labelEn: "Transfer Status", labelZh: "移植状态" },
    ],
  },
];
