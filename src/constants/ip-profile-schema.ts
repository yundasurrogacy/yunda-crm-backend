/**
 * 字段定义来源：修改/新版yunda-crm/ip profile内容.xlsx
 * 全部写入 intended_parents.profile_data。
 */
import type { ProfileSectionDef } from "@/constants/gc-profile-schema";

const IP1_FIELDS = [
  { key: "ip1_full_name", labelEn: "Full Name", labelZh: "姓名" },
  { key: "ip1_date_of_birth", labelEn: "Date of Birth", labelZh: "出生时间" },
  { key: "ip1_gender", labelEn: "Gender", labelZh: "性别" },
  { key: "ip1_ethnicity", labelEn: "Ethnicity", labelZh: "种族" },
  { key: "ip1_marital_status", labelEn: "Marital Status", labelZh: "婚姻状态" },
  { key: "ip1_occupation", labelEn: "Occupation", labelZh: "职业" },
  { key: "ip1_citizenship", labelEn: "Citizenship", labelZh: "国籍" },
  { key: "ip1_address", labelEn: "Address", labelZh: "地址" },
  { key: "ip1_email", labelEn: "Email", labelZh: "邮箱" },
  { key: "ip1_phone", labelEn: "Phone", labelZh: "电话" },
] as const;

export const IP_PROFILE_SECTIONS: ProfileSectionDef[] = [
  {
    id: "ip1",
    titleEn: "Intended Parent 1",
    titleZh: "准父母 1",
    fields: [...IP1_FIELDS],
  },
  {
    id: "ip2",
    titleEn: "Intended Parent 2",
    titleZh: "准父母 2",
    fields: IP1_FIELDS.map((f) => ({
      ...f,
      key: f.key.replace("ip1_", "ip2_"),
    })),
  },
  {
    id: "ivf_clinic",
    titleEn: "IVF Clinic",
    titleZh: "IVF 诊所信息",
    fields: [
      { key: "ivf_clinic_name", labelEn: "IVF Clinic Name", labelZh: "IVF 诊所名称" },
      { key: "ivf_doctor", labelEn: "IVF Doctor", labelZh: "IVF 主治医生" },
      { key: "ivf_coordinator", labelEn: "IVF Coordinator", labelZh: "IVF 协调员" },
      { key: "ivf_clinic_contact_email", labelEn: "IVF Clinic Contact Email", labelZh: "IVF 诊所邮箱" },
    ],
  },
  {
    id: "embryo",
    titleEn: "Embryo / Donor Information",
    titleZh: "胚胎 / 捐赠信息",
    fields: [
      { key: "egg_donor_usage", labelEn: "Egg Donor Usage", labelZh: "卵子捐赠使用情况" },
      { key: "sperm_donor_usage", labelEn: "Sperm Donor Usage", labelZh: "精子捐赠使用情况" },
      { key: "embryo_pgt_a_testing_status", labelEn: "Embryo PGT-A Testing Status", labelZh: "胚胎 PGT-A 检测情况" },
      { key: "embryo_count", labelEn: "Embryo Count", labelZh: "胚胎数量" },
      { key: "has_embryos", labelEn: "Has Embryos", labelZh: "是否已有胚胎" },
    ],
  },
  {
    id: "program",
    titleEn: "Program preferences",
    titleZh: "项目偏好",
    fields: [
      { key: "interested_services", labelEn: "Interested Services", labelZh: "意向服务" },
      { key: "journey_start_timing", labelEn: "Journey Start Timing", labelZh: "计划开始时间" },
      { key: "desired_children_count", labelEn: "Desired Children Count", labelZh: "期望子女数量" },
      { key: "sexual_orientation", labelEn: "Sexual Orientation", labelZh: "性取向" },
      { key: "referral_source", labelEn: "Referral Source", labelZh: "推荐来源" },
    ],
  },
];
