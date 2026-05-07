import { createHash, timingSafeEqual } from "node:crypto";

/** 与 Hasura users.password：小写 32 位 md5（hex） */
export function md5PasswordHexLower(plain: string): string {
  return createHash("md5").update(plain, "utf8").digest("hex").toLowerCase();
}

export function verifyStoredPassword(
  plain: string,
  storedHash: string,
): boolean {
  const stored = storedHash.trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/u.test(stored)) {
    return false;
  }
  const expected = md5PasswordHexLower(plain);
  if (!/^[0-9a-f]{32}$/u.test(expected)) {
    return false;
  }
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(stored, "hex"),
    );
  } catch {
    return false;
  }
}
