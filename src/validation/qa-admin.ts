import type {
  QaAdminFilters,
  QaAdminItem,
  QaAdminWorkspace,
  QaStatus,
  QaDecisionInput,
  QaHistory,
} from "../domain/qa-admin";
import { isRecord } from "./member-account";
import { inquiryUuid } from "./connected-inquiry";
import { parseReviewReason } from "./admin";
import { parseModerationNote } from "./qa-moderation";
const uuid = (v: unknown): v is string =>
  typeof v === "string" && inquiryUuid.test(v);
export const qaStatus = (v: unknown): v is QaStatus =>
  ["pending", "published", "hidden", "rejected"].includes(String(v));
const positive = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
export function parseQaAdminFilters(
  raw: Record<string, unknown>,
): QaAdminFilters | null {
  if (
    Object.keys(raw).some(
      (k) =>
        !["queue", "status", "category", "q", "page", "id", "parent"].includes(
          k,
        ),
    ) ||
    Object.values(raw).some((v) => typeof v !== "string" && v !== undefined)
  )
    return null;
  const queue = raw.queue ?? "questions",
    status = raw.status ?? "pending",
    category = String(raw.category ?? ""),
    q = String(raw.q ?? "").trim(),
    page = raw.page === undefined ? 1 : Number(raw.page),
    id = raw.id || null,
    parent = raw.parent || null;
  if (
    !["questions", "answers"].includes(String(queue)) ||
    (status !== "all" && !qaStatus(status)) ||
    category.length > 80 ||
    q.length > 120 ||
    !positive(page) ||
    page > 10000 ||
    (id !== null && !uuid(id)) ||
    (parent !== null && !uuid(parent))
  )
    return null;
  return {
    queue: queue as QaAdminFilters["queue"],
    status: status as QaAdminFilters["status"],
    category,
    q,
    page,
    id: id as string | null,
    parent: parent as string | null,
  };
}
export function parseQaDecision(raw: unknown): QaDecisionInput | null {
  if (
    !isRecord(raw) ||
    Object.keys(raw).length !== 7 ||
    !Object.keys(raw).every((k) =>
      [
        "kind",
        "id",
        "version",
        "parentVersion",
        "action",
        "reason",
        "note",
      ].includes(k),
    ) ||
    !["question", "answer"].includes(String(raw.kind)) ||
    !uuid(raw.id) ||
    !positive(raw.version) ||
    (raw.kind === "question"
      ? raw.parentVersion !== null
      : !positive(raw.parentVersion)) ||
    !["publish", "reject", "hide", "restore"].includes(String(raw.action))
  )
    return null;
  const reason = parseReviewReason(raw.reason),
    note = parseModerationNote(raw.note);
  return reason && note !== null
    ? {
        kind: raw.kind as QaDecisionInput["kind"],
        id: raw.id,
        version: Number(raw.version),
        parentVersion: raw.parentVersion as number | null,
        action: raw.action as QaDecisionInput["action"],
        reason,
        note,
      }
    : null;
}
function item(raw: unknown): QaAdminItem | null {
  if (
    !isRecord(raw) ||
    !["question", "answer"].includes(String(raw.kind)) ||
    !uuid(raw.id) ||
    !uuid(raw.questionId) ||
    !qaStatus(raw.status) ||
    !qaStatus(raw.parentStatus) ||
    !positive(raw.version) ||
    !positive(raw.parentVersion) ||
    !["title", "body", "categoryId", "note", "attribution"].every(
      (k) => typeof raw[k] === "string",
    ) ||
    !Number.isSafeInteger(raw.answerCount) ||
    Number(raw.answerCount) < 0 ||
    typeof raw.canPublish !== "boolean"
  )
    return null;
  return {
    kind: raw.kind as QaAdminItem["kind"],
    id: raw.id,
    questionId: raw.questionId,
    title: String(raw.title),
    body: String(raw.body),
    categoryId: String(raw.categoryId),
    status: raw.status,
    version: Number(raw.version),
    parentStatus: raw.parentStatus,
    parentVersion: Number(raw.parentVersion),
    note: String(raw.note),
    attribution: String(raw.attribution),
    answerCount: Number(raw.answerCount),
    canPublish: raw.canPublish,
  };
}
export function parseAdminQa(raw: unknown): QaAdminWorkspace | null {
  if (
    !isRecord(raw) ||
    !["questions", "answers"].includes(String(raw.queue)) ||
    !positive(raw.page) ||
    typeof raw.hasNext !== "boolean" ||
    !Number.isSafeInteger(raw.total) ||
    Number(raw.total) < 0 ||
    !Array.isArray(raw.items) ||
    !Array.isArray(raw.catalog) ||
    !isRecord(raw.counts) ||
    !["questions", "answers", "pendingQuestions", "pendingAnswers"].every(
      (k) =>
        Number.isSafeInteger((raw.counts as Record<string, unknown>)[k]) &&
        Number((raw.counts as Record<string, unknown>)[k]) >= 0,
    )
  )
    return null;
  const items: QaAdminItem[] = [];
  for (const row of raw.items) {
    const i = item(row);
    if (!i) return null;
    items.push(i);
  }
  const catalog = [];
  for (const c of raw.catalog) {
    if (!isRecord(c) || typeof c.id !== "string" || typeof c.name !== "string")
      return null;
    catalog.push({ id: c.id, name: c.name });
  }
  let detail: QaAdminWorkspace["detail"] = null;
  if (raw.detail !== null) {
    const i = item(raw.detail);
    if (!i || !isRecord(raw.detail) || !Array.isArray(raw.detail.history))
      return null;
    const history: QaHistory[] = [];
    for (const h of raw.detail.history) {
      if (
        !isRecord(h) ||
        !positive(h.version) ||
        !["publish", "reject", "hide", "restore"].includes(String(h.action)) ||
        !qaStatus(h.previousStatus) ||
        !qaStatus(h.nextStatus) ||
        !uuid(h.actorId) ||
        !["reason", "note", "body", "title", "at"].every(
          (k) => typeof h[k] === "string",
        ) ||
        !Number.isFinite(Date.parse(String(h.at)))
      )
        return null;
      history.push({
        version: Number(h.version),
        action: h.action as QaHistory["action"],
        previousStatus: h.previousStatus,
        nextStatus: h.nextStatus,
        actorId: h.actorId,
        reason: String(h.reason),
        note: String(h.note),
        body: String(h.body),
        title: String(h.title),
        at: String(h.at),
      });
    }
    detail = { ...i, history };
  }
  return {
    queue: raw.queue as QaAdminWorkspace["queue"],
    page: Number(raw.page),
    total: Number(raw.total),
    hasNext: raw.hasNext,
    items,
    detail,
    catalog,
    counts: {
      questions: Number(raw.counts.questions),
      answers: Number(raw.counts.answers),
      pendingQuestions: Number(raw.counts.pendingQuestions),
      pendingAnswers: Number(raw.counts.pendingAnswers),
    },
  };
}
