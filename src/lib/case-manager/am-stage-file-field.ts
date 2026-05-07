import type { AmStageFieldDef } from "@/constants/am-stage-fields-types";

/**
 * Excel 中带文件/附件类意图的字段识别（type 优先，辅以 label）。
 * 若某列需在表单中改为文件上传，建议将 Excel 中 type 设为 `File`、`Upload`、`附件` 等。
 */
export function isAmStageFileUploadField(def: AmStageFieldDef): boolean {
  const typeRaw = def.type.trim();
  const typeL = typeRaw.toLowerCase();
  const labelL = def.label.trim().toLowerCase();

  if (typeRaw) {
    if (/\b(file|upload)\b|\battachments?\b|^url$/i.test(typeL)) return true;
    if (/附件|上传|签字|签名|扫描|凭证|护照|证照|驾照|户口本|结婚证|病历|病历单|超声波|彩超|化验单|保单|证明文件/.test(def.type.trim())) return true;
    if (/\bpdf\b|\bjpe?g\b|\bpng\b|\bimage\b|\bphoto\b|\bpicture\b/.test(typeL)) return true;
  }

  if (/\b(attachment|upload)\b|\b附件\b|签字|签名|护照|证照|户口本|结婚证|保单|证明文件|彩超|超声波|病历/.test(labelL)) return true;

  return false;
}
