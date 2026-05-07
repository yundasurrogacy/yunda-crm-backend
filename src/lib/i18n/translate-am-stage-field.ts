import type { AmStageFieldDef } from "@/constants/am-stage-fields-types";

const exactZh: Record<string, string> = {
  "Intended Mother": "准妈妈",
  "Intended Mother DOB": "准妈妈出生日期",
  "Intended Father": "准爸爸",
  "Intended Father DOB": "准爸爸出生日期",
  "Intended Parents Marital Status": "准父母婚姻状况",
  "Intended Parents Cell Phone": "准父母手机",
  "Intended Parents Email": "准父母邮箱",
  "Intended Parents Address": "准父母地址",
  "Embryos will be created by (check all that apply)": "胚胎来源（可多选）",
  "GC Name": "代孕母亲姓名",
  "GC Owner": "代孕母亲负责人",
  "Case Manager": "案例经理",
  "GC Coordinator": "代孕母亲协调员",
  "Matching Coordinator": "匹配协调员",
  "Base Compensation": "基础补偿",
  "Experienced Surrogate": "有经验的代孕母亲",
  Phone: "电话",
  Age: "年龄",
  "Date of Birth": "出生日期",
  "Place of Birth": "出生地",
  Address: "地址",
  "Email Address": "邮箱地址",
  "Marital Status": "婚姻状况",
  "Are you a U.S. Citizen or legal U.S. Resident?": "是否为美国公民或美国合法居民？",
  "Number of Driver's License": "驾照号码",
  "Driver's License Issue State": "驾照签发州",
  "Social Security Number": "社会安全号码",
  "Ethnicity/ Race": "族裔 / 种族",
  "What Languages Do You Speak Fluently?": "熟练使用的语言",
  Occupation: "职业",
  "Your Emergency Contact Name": "紧急联系人姓名",
  "Your Emergency Contact Phone": "紧急联系人电话",
  "Your Emergency Contact Email": "紧急联系人邮箱",
  "IP Attorney": "准父母律师",
  "IP Attorney Email": "准父母律师邮箱",
  "GC Review Attorney": "代孕母亲审阅律师",
  "GC Review Attorney Email": "代孕母亲审阅律师邮箱",
  "Escrow Platform": "托管平台",
  "Escrow Email": "托管邮箱",
  "Notary date": "公证日期",
  "Escrow Details": "托管详情",
  "Legal Clearance Complete": "法律许可完成日期",
  "Delivery Hospital Name": "分娩医院名称",
  "Hospital Social Worker (PBO)": "医院社工（PBO）",
  "Social Worker Phone": "社工电话",
  "Social Worker Email": "社工邮箱",
  "Expected Delivery date": "预产期",
  "Postpartum / closeout field": "产后 / 结案字段",
  Psychologist: "心理医生",
  "Psychologist Email": "心理医生邮箱",
  "Psychological Clearance Complete": "心理评估通过日期",
  "Medical Clearance Complete": "医疗筛查通过日期",
};

const phraseZh: Array<[RegExp, string]> = [
  [/\bIntended Parents\b/gi, "准父母"],
  [/\bIntended Mother\b/gi, "准妈妈"],
  [/\bIntended Father\b/gi, "准爸爸"],
  [/\bGC Review Attorney\b/gi, "代孕母亲审阅律师"],
  [/\bGC Coordinator\b/gi, "代孕母亲协调员"],
  [/\bGC Owner\b/gi, "代孕母亲负责人"],
  [/\bGC Name\b/gi, "代孕母亲姓名"],
  [/\bGC\b/g, "代孕母亲"],
  [/\bIP Attorney\b/gi, "准父母律师"],
  [/\bIP\b/g, "准父母"],
  [/\bDOB\b/g, "出生日期"],
  [/\bDate of Birth\b/gi, "出生日期"],
  [/\bCell Phone\b/gi, "手机"],
  [/\bEmail Address\b/gi, "邮箱地址"],
  [/\bEmail\b/gi, "邮箱"],
  [/\bPhone\b/gi, "电话"],
  [/\bAddress\b/gi, "地址"],
  [/\bMarital Status\b/gi, "婚姻状况"],
  [/\bEmergency Contact\b/gi, "紧急联系人"],
  [/\bCase Manager\b/gi, "案例经理"],
  [/\bCoordinator\b/gi, "协调员"],
  [/\bAttorney\b/gi, "律师"],
  [/\bDoctor\b/gi, "医生"],
  [/\bClinic\b/gi, "诊所"],
  [/\bHospital\b/gi, "医院"],
  [/\bNurse\b/gi, "护士"],
  [/\bSocial Worker\b/gi, "社工"],
  [/\bEscrow\b/gi, "托管"],
  [/\bLegal Clearance\b/gi, "法律许可"],
  [/\bMedical Clearance\b/gi, "医疗筛查通过"],
  [/\bPsychological Clearance\b/gi, "心理评估通过"],
  [/\bComplete\b/gi, "完成"],
  [/\bCompleted\b/gi, "已完成"],
  [/\bScheduled\b/gi, "已安排"],
  [/\bExpected\b/gi, "预计"],
  [/\bDelivery\b/gi, "分娩"],
  [/\bBirth\b/gi, "出生"],
  [/\bAge\b/gi, "年龄"],
  [/\bName\b/gi, "姓名"],
  [/\bOwner\b/gi, "负责人"],
  [/\bMatching\b/gi, "匹配"],
  [/\bBase Compensation\b/gi, "基础补偿"],
  [/\bCompensation\b/gi, "补偿"],
  [/\bExperienced Surrogate\b/gi, "有经验的代孕母亲"],
  [/\bSurrogate\b/gi, "代孕母亲"],
  [/\bEmbryos?\b/gi, "胚胎"],
  [/\bCreated by\b/gi, "来源"],
  [/\bcheck all that apply\b/gi, "可多选"],
  [/\bPlace of\b/gi, ""],
  [/\bState\b/gi, "州"],
  [/\bNumber\b/gi, "号码"],
  [/\bDriver'?s License\b/gi, "驾照"],
  [/\bIssue\b/gi, "签发"],
  [/\bSocial Security\b/gi, "社会安全"],
  [/\bEthnicity\b/gi, "族裔"],
  [/\bRace\b/gi, "种族"],
  [/\bLanguages?\b/gi, "语言"],
  [/\bSpeak Fluently\b/gi, "熟练使用"],
  [/\bOccupation\b/gi, "职业"],
  [/\bDetails\b/gi, "详情"],
  [/\bPlatform\b/gi, "平台"],
  [/\bNotary\b/gi, "公证"],
  [/\bDate\b/gi, "日期"],
  [/\bField\b/gi, "字段"],
  [/\bDedicated\b/gi, "专用"],
  [/\bStatus\b/gi, "状态"],
  [/\bAmount\b/gi, "金额"],
  [/\bNotes?\b/gi, "备注"],
  [/\bYes\/No\b/gi, "是 / 否"],
  [/\bU\.S\.\b/g, "美国"],
  [/\bCitizen\b/gi, "公民"],
  [/\bLegal\b/gi, "合法"],
  [/\bResident\b/gi, "居民"],
];

function normalizeLabel(label: string) {
  return label.trim().replace(/:$/, "").replace(/\s+/g, " ");
}

function cleanupZh(label: string) {
  return label
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s*\(\s*/g, "（")
    .replace(/\s*\)\s*/g, "）")
    .replace(/\s+/g, "")
    .replace(/（可多选）/g, "（可多选）")
    .trim();
}

export function translateAmStageFieldLabel(def: AmStageFieldDef, language: string): string {
  if (!language.toLowerCase().startsWith("zh")) return def.label;

  const label = normalizeLabel(def.label);
  const exact = exactZh[label];
  if (exact) return exact;

  let translated = label;
  for (const [pattern, replacement] of phraseZh) {
    translated = translated.replace(pattern, replacement);
  }

  return translated === label ? def.label : cleanupZh(translated);
}
