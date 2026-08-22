/** 统一业务日期展示/录入格式：MM-DD-YYYY */

const MDY_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-(\d{4})$/u;

export function isValidMmDdYyyy(raw: string): boolean {
  const s = raw.trim();
  if (!MDY_RE.test(s)) return false;
  const [mm, dd, yyyy] = s.split("-").map((x) => Number(x));
  if (!mm || !dd || !yyyy) return false;
  const d = new Date(yyyy, mm - 1, dd);
  return d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd;
}

/** 从自由输入提取数字并格式化为 MM-DD-YYYY（输入过程中可用）。 */
export function maskMmDdYyyyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

/**
 * 尝试把常见日期串规范为 MM-DD-YYYY；无法识别则返回 trim 后原文。
 * 支持：MM-DD-YYYY、YYYY-MM-DD、M/D/YYYY、ISO 日期前缀。
 */
export function normalizeToMmDdYyyy(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (isValidMmDdYyyy(s)) return s;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const out = `${iso[2]}-${iso[3]}-${iso[1]}`;
    return isValidMmDdYyyy(out) ? out : s;
  }

  const slash = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (slash) {
    const mm = slash[1]!.padStart(2, "0");
    const dd = slash[2]!.padStart(2, "0");
    const yyyy = slash[3]!;
    const out = `${mm}-${dd}-${yyyy}`;
    return isValidMmDdYyyy(out) ? out : s;
  }

  const masked = maskMmDdYyyyInput(s);
  return isValidMmDdYyyy(masked) ? masked : s;
}
