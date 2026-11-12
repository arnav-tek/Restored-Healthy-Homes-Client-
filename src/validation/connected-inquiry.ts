import { isRecord } from "./member-account";
import { validateInquiry } from "./inquiry";
import type { InquirySubmission } from "../domain/inbox";

export const inquiryUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseInquirySubmission(raw: unknown) {
  const keys = ["professionalId", "requestId", "name", "email", "message"];
  if (
    !isRecord(raw) ||
    Object.keys(raw).length !== keys.length ||
    Object.keys(raw).some((key) => !keys.includes(key)) ||
    keys.some((key) => typeof raw[key] !== "string") ||
    !inquiryUuid.test(String(raw.professionalId)) ||
    !inquiryUuid.test(String(raw.requestId))
  )
    return {
      ok: false as const,
      error: "Only the inquiry fields can be submitted.",
    };
  const errors = validateInquiry({
    name: raw.name,
    email: raw.email,
    message: raw.message,
  });
  if (Object.keys(errors).length)
    return {
      ok: false as const,
      error: "Check the highlighted fields.",
      errors,
    };
  const input: InquirySubmission = {
    professionalId: String(raw.professionalId),
    requestId: String(raw.requestId),
    name: String(raw.name).trim(),
    email: String(raw.email).trim(),
    message: String(raw.message).trim(),
  };
  return { ok: true as const, input };
}
export function parseInboxPage(raw: string | null): number | null {
  if (raw === null) return 1;
  return /^[1-9][0-9]{0,3}$/.test(raw) || raw === "10000" ? Number(raw) : null;
}
export function parseInquiryReadState(raw: unknown) {
  if (
    !isRecord(raw) ||
    Object.keys(raw).length !== 3 ||
    Object.keys(raw).some((key) => !["id", "read", "version"].includes(key)) ||
    typeof raw.id !== "string" ||
    !inquiryUuid.test(raw.id) ||
    typeof raw.read !== "boolean" ||
    !Number.isSafeInteger(raw.version) ||
    Number(raw.version) < 1
  )
    return null;
  return { id: raw.id, read: raw.read, version: Number(raw.version) };
}
