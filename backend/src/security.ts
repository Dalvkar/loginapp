import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
export const SESSION_COOKIE = "session_id";
export const CSRF_COOKIE = "csrf_token";
export const randomToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function tokensEqual(left: unknown, right: unknown): boolean {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
