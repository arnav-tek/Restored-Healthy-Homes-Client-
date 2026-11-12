import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { NotificationAdapter } from "./contracts";

export function validNotificationWorkerToken(
  value: string | undefined,
): value is string {
  return !!value && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}
export function authorizedNotificationWorker(
  header: string | null,
  expected: string | undefined,
) {
  if (!validNotificationWorkerToken(expected) || !header?.startsWith("Bearer "))
    return false;
  const actual = header.slice(7);
  if (!validNotificationWorkerToken(actual)) return false;
  return timingSafeEqual(
    createHash("sha256").update(actual).digest(),
    createHash("sha256").update(expected).digest(),
  );
}
/** Live composition is intentionally disabled until a provider/sender is approved.
 * Test adapters are dependency-injected in isolated tests, never selected by env.
 */
export function configuredInquiryEmailAdapter(): NotificationAdapter | null {
  const provider = process.env.RHH_INQUIRY_EMAIL_PROVIDER ?? "disabled";
  if (provider !== "disabled")
    throw new Error(
      "Inquiry email provider has not been approved or implemented.",
    );
  return null;
}
