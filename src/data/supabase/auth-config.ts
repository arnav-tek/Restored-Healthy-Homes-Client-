import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
export const recoveryCookie = "rhh-recovery";
export function authConfiguration() {
  const origin = process.env.RHH_AUTH_ORIGIN;
  const secret = process.env.RHH_AUTH_COOKIE_SECRET;
  if (!origin || !secret || secret.length < 32)
    throw new Error(
      "Configure RHH_AUTH_ORIGIN and RHH_AUTH_COOKIE_SECRET for connected Auth.",
    );
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !["http://127.0.0.1:3230", "http://localhost:3230"].includes(origin))
  )
    throw new Error("Invalid connected Auth origin.");
  return { origin, secret };
}
export function recoveryGrant(id: string, now = Date.now()): string {
  const value = Buffer.from(
    JSON.stringify({ id, expires: now + 10 * 60 * 1000 }),
  ).toString("base64url");
  return `${value}.${createHmac("sha256", authConfiguration().secret).update(value).digest("base64url")}`;
}
export function validRecoveryGrant(
  value: string | undefined,
  id: string,
  now = Date.now(),
): boolean {
  if (!value || value.length > 1000) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", authConfiguration().secret)
    .update(payload)
    .digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return false;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    );
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "id" in parsed &&
      parsed.id === id &&
      "expires" in parsed &&
      typeof parsed.expires === "number" &&
      parsed.expires > now
    );
  } catch {
    return false;
  }
}
