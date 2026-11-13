import type { PublicReview } from "../domain/review";
import { isReviewRating } from "../domain/review";
import type {
  ReviewSubmission,
  ReviewDecisionInput,
  ReviewFilters,
  SavedReview,
  AdminReviewsWorkspace,
  ReviewHistory,
  MemberReviewsWorkspace,
} from "../domain/connected-reviews";
import { isRecord } from "./member-account";
import { inquiryUuid } from "./connected-inquiry";
import { parseReview } from "./review";
import { parseReviewReason } from "./admin";
import { parseModerationNote } from "./qa-moderation";
import { qaStatus } from "./qa-admin";
const uuid = (v: unknown): v is string =>
  typeof v === "string" && inquiryUuid.test(v);
const positive = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
export function parseReviewSubmission(raw: unknown): ReviewSubmission | null {
  if (
    !isRecord(raw) ||
    Object.keys(raw).length !== 4 ||
    !Object.keys(raw).every((k) =>
      ["requestId", "displayName", "rating", "body"].includes(k),
    ) ||
    !uuid(raw.requestId)
  )
    return null;
  const p = parseReview(raw);
  return p.ok ? { ...p.fields, requestId: raw.requestId } : null;
}
export function parsePublicReviews(raw: unknown): PublicReview[] | null {
  if (!Array.isArray(raw)) return null;
  const result: PublicReview[] = [];
  const ids = new Set<string>();
  for (const r of raw) {
    if (
      !isRecord(r) ||
      !uuid(r.id) ||
      ids.has(r.id) ||
      !uuid(r.professionalId) ||
      typeof r.displayName !== "string" ||
      !isReviewRating(r.rating) ||
      typeof r.body !== "string" ||
      typeof r.publishedAt !== "string" ||
      !Number.isFinite(Date.parse(r.publishedAt))
    )
      return null;
    ids.add(r.id);
    result.push({
      id: r.id,
      professionalId: r.professionalId,
      displayName: r.displayName,
      rating: r.rating,
      body: r.body,
      publishedAt: r.publishedAt,
    });
  }
  return result;
}
export function parseReviewFilters(
  raw: Record<string, unknown>,
): ReviewFilters | null {
  if (
    Object.keys(raw).some(
      (k) => !["status", "professional", "id", "page"].includes(k),
    ) ||
    Object.values(raw).some((v) => typeof v !== "string" && v !== undefined)
  )
    return null;
  const status = raw.status ?? "pending",
    professional = raw.professional || null,
    id = raw.id || null,
    page = raw.page === undefined ? 1 : Number(raw.page);
  if (
    (status !== "all" && !qaStatus(status)) ||
    (professional !== null && !uuid(professional)) ||
    (id !== null && !uuid(id)) ||
    !positive(page) ||
    page > 10000
  )
    return null;
  return {
    status: status as ReviewFilters["status"],
    professional: professional as string | null,
    id: id as string | null,
    page,
  };
}
export function parseReviewDecision(raw: unknown): ReviewDecisionInput | null {
  if (
    !isRecord(raw) ||
    Object.keys(raw).length !== 5 ||
    !Object.keys(raw).every((k) =>
      ["id", "version", "action", "reason", "note"].includes(k),
    ) ||
    !uuid(raw.id) ||
    !positive(raw.version) ||
    !["publish", "hide", "reject", "restore"].includes(String(raw.action))
  )
    return null;
  const reason = parseReviewReason(raw.reason),
    note = parseModerationNote(raw.note);
  return reason && note !== null
    ? {
        id: raw.id,
        version: Number(raw.version),
        action: raw.action as ReviewDecisionInput["action"],
        reason,
        note,
      }
    : null;
}
function saved(raw: unknown): SavedReview | null {
  if (
    !isRecord(raw) ||
    !uuid(raw.id) ||
    !uuid(raw.professionalId) ||
    typeof raw.displayName !== "string" ||
    typeof raw.body !== "string" ||
    !isReviewRating(raw.rating) ||
    !qaStatus(raw.status) ||
    !positive(raw.version) ||
    typeof raw.note !== "string" ||
    typeof raw.eligible !== "boolean"
  )
    return null;
  return {
    id: raw.id,
    professionalId: raw.professionalId,
    displayName: raw.displayName,
    body: raw.body,
    rating: raw.rating,
    status: raw.status,
    version: Number(raw.version),
    note: raw.note,
    eligible: raw.eligible,
  };
}
export function parseAdminReviews(raw: unknown): AdminReviewsWorkspace | null {
  if (
    !isRecord(raw) ||
    !positive(raw.page) ||
    typeof raw.hasNext !== "boolean" ||
    !Number.isSafeInteger(raw.total) ||
    Number(raw.total) < 0 ||
    !Array.isArray(raw.items) ||
    !Array.isArray(raw.professionals)
  )
    return null;
  const items: SavedReview[] = [];
  for (const r of raw.items) {
    const p = saved(r);
    if (!p) return null;
    items.push(p);
  }
  const professionals = [];
  for (const p of raw.professionals) {
    if (!isRecord(p) || !uuid(p.id) || typeof p.businessName !== "string")
      return null;
    professionals.push({ id: p.id, businessName: p.businessName });
  }
  let detail: AdminReviewsWorkspace["detail"] = null;
  if (raw.detail !== null) {
    const p = saved(raw.detail);
    if (!p || !isRecord(raw.detail) || !Array.isArray(raw.detail.history))
      return null;
    const history: ReviewHistory[] = [];
    for (const h of raw.detail.history) {
      if (
        !isRecord(h) ||
        !positive(h.version) ||
        !["publish", "hide", "reject", "restore"].includes(String(h.action)) ||
        !qaStatus(h.previousStatus) ||
        !qaStatus(h.nextStatus) ||
        !uuid(h.actorId) ||
        typeof h.reason !== "string" ||
        typeof h.note !== "string" ||
        typeof h.body !== "string" ||
        typeof h.displayName !== "string" ||
        !isReviewRating(h.rating) ||
        typeof h.at !== "string" ||
        !Number.isFinite(Date.parse(h.at))
      )
        return null;
      history.push({
        version: Number(h.version),
        action: h.action as ReviewHistory["action"],
        previousStatus: h.previousStatus,
        nextStatus: h.nextStatus,
        actorId: h.actorId,
        reason: h.reason,
        note: h.note,
        body: h.body,
        displayName: h.displayName,
        rating: h.rating,
        at: h.at,
      });
    }
    detail = { ...p, history };
  }
  return {
    page: Number(raw.page),
    hasNext: raw.hasNext,
    total: Number(raw.total),
    items,
    detail,
    professionals,
  };
}
export function parseMemberReviews(
  raw: unknown,
): MemberReviewsWorkspace | null {
  if (
    !isRecord(raw) ||
    (raw.professionalId !== null && !uuid(raw.professionalId))
  )
    return null;
  const reviews = parsePublicReviews(raw.reviews);
  return reviews &&
    reviews.every((r) => r.professionalId === raw.professionalId)
    ? { professionalId: raw.professionalId as string | null, reviews }
    : null;
}
