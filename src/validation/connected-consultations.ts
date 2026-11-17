import { isRecord } from "./member-account";
import { inquiryUuid } from "./connected-inquiry";
import { parseConsultation } from "./consultation";
import { consultationStatuses } from "../domain/consultation";
import type {
  ConsultationItem,
  ConsultationWorkspace,
} from "../domain/connected-consultations";
export const receiptToken = /^[a-f0-9]{64}$/;
export function parseConsultationPreference(raw: unknown) {
  if (
    !isRecord(raw) ||
    Object.keys(raw).sort().join(",") !== "enabled,version" ||
    typeof raw.enabled !== "boolean" ||
    !Number.isSafeInteger(raw.version) ||
    Number(raw.version) < 1 ||
    Number(raw.version) > 999999999
  )
    return null;
  return { enabled: raw.enabled, version: Number(raw.version) };
}
export function parseConsultationSubmission(raw: unknown) {
  if (
    !isRecord(raw) ||
    Object.keys(raw).length !== 7 ||
    Object.keys(raw).some(
      (k) =>
        ![
          "name",
          "email",
          "categoryId",
          "format",
          "topic",
          "requestId",
          "token",
        ].includes(k),
    ) ||
    typeof raw.requestId !== "string" ||
    !inquiryUuid.test(raw.requestId) ||
    typeof raw.token !== "string" ||
    !receiptToken.test(raw.token)
  )
    return null;
  // Dynamic category validity is checked atomically by the database.
  if (typeof raw.categoryId !== "string" || raw.categoryId.length > 100)
    return null;
  const parsed = parseConsultation(raw, [{ id: raw.categoryId }]);
  return parsed.ok
    ? { ...parsed.fields, requestId: raw.requestId, token: raw.token }
    : null;
}
export function parseConsultationAction(raw: unknown, admin: boolean) {
  if (
    !isRecord(raw) ||
    typeof raw.action !== "string" ||
    !(admin ? ["assign", "cancel", "note"] : ["accept", "decline"]).includes(
      raw.action,
    )
  )
    return null;
  const allowed = [
    "action",
    "id",
    "version",
    ...(raw.action === "assign"
      ? ["professionalId"]
      : raw.action === "note"
        ? ["note"]
        : []),
  ];
  if (
    Object.keys(raw).length !== allowed.length ||
    Object.keys(raw).some((k) => !allowed.includes(k)) ||
    typeof raw.id !== "string" ||
    !inquiryUuid.test(raw.id) ||
    !Number.isSafeInteger(raw.version) ||
    Number(raw.version) < 1
  )
    return null;
  if (
    raw.action === "assign" &&
    (typeof raw.professionalId !== "string" ||
      !inquiryUuid.test(raw.professionalId))
  )
    return null;
  if (
    raw.action === "note" &&
    (typeof raw.note !== "string" || raw.note.length > 500)
  )
    return null;
  const { action, ...payload } = raw;
  return { action, payload };
}
export function parseConsultationWorkspace(
  raw: unknown,
  admin: boolean,
): ConsultationWorkspace | null {
  if (
    !isRecord(raw) ||
    !Array.isArray(raw.items) ||
    raw.items.length > 20 ||
    !Array.isArray(raw.candidates) ||
    !Number.isSafeInteger(raw.page) ||
    typeof raw.hasNext !== "boolean"
  )
    return null;
  const items: ConsultationItem[] = [];
  for (const r of raw.items) {
    if (
      !isRecord(r) ||
      typeof r.id !== "string" ||
      !inquiryUuid.test(r.id) ||
      typeof r.categoryId !== "string" ||
      typeof r.topic !== "string" ||
      typeof r.format !== "string" ||
      !consultationStatuses.includes(r.status as never) ||
      !Number.isSafeInteger(r.version) ||
      typeof r.createdAt !== "string" ||
      (r.professionalId !== null && typeof r.professionalId !== "string")
    )
      return null;
    if (admin && [r.name, r.email, r.note].some((v) => typeof v !== "string"))
      return null;
    items.push({
      id: r.id,
      categoryId: r.categoryId,
      ...(typeof r.categoryName === "string" && r.categoryName.length <= 160
        ? { categoryName: r.categoryName }
        : {}),
      topic: r.topic,
      format: r.format,
      status: r.status as ConsultationItem["status"],
      version: Number(r.version),
      createdAt: r.createdAt,
      professionalId: r.professionalId,
      ...(admin
        ? { name: String(r.name), email: String(r.email), note: String(r.note) }
        : {}),
    });
  }
  const candidates: ConsultationWorkspace["candidates"] = [];
  if (admin)
    for (const c of raw.candidates) {
      if (
        !isRecord(c) ||
        typeof c.id !== "string" ||
        typeof c.name !== "string" ||
        !Array.isArray(c.categoryIds) ||
        !c.categoryIds.every((v) => typeof v === "string")
      )
        return null;
      candidates.push({ id: c.id, name: c.name, categoryIds: c.categoryIds });
    }
  return { items, candidates, page: Number(raw.page), hasNext: raw.hasNext };
}
