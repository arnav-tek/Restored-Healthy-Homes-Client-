import type {
  PublicQaSnapshot,
  MemberQaWorkspace,
  OwnQaAnswer,
  QuestionSubmission,
  AnswerSubmission,
} from "../domain/connected-qa";
import type { PublicAnswer, PublicQuestion } from "../domain/qa";
import { inquiryUuid } from "./connected-inquiry";
import { isRecord } from "./member-account";
import { parseQuestion } from "./qa";
import { parseAnswer } from "./qa-moderation";
const uuid = (v: unknown): v is string =>
  typeof v === "string" && inquiryUuid.test(v);
const text = (v: unknown): v is string => typeof v === "string";
function catalog(raw: unknown) {
  if (!Array.isArray(raw)) return null;
  const result = [];
  for (const c of raw) {
    if (
      !isRecord(c) ||
      !text(c.id) ||
      !text(c.name) ||
      typeof c.active !== "boolean"
    )
      return null;
    result.push({ id: c.id, name: c.name, active: c.active });
  }
  return result;
}
function question(raw: unknown) {
  if (
    !isRecord(raw) ||
    !uuid(raw.id) ||
    !text(raw.title) ||
    !text(raw.categoryId) ||
    !text(raw.body)
  )
    return null;
  return {
    id: raw.id,
    title: raw.title,
    body: raw.body,
    categoryId: raw.categoryId,
  };
}
export function parsePublicQa(raw: unknown): PublicQaSnapshot | null {
  if (!isRecord(raw) || !Array.isArray(raw.questions)) return null;
  const cats = catalog(raw.catalog);
  if (!cats) return null;
  const questions: PublicQuestion[] = [];
  for (const row of raw.questions) {
    const q = question(row);
    if (!q || !isRecord(row) || !Array.isArray(row.answers)) return null;
    const answers: PublicAnswer[] = [];
    for (const a of row.answers) {
      if (!isRecord(a) || !uuid(a.id) || !text(a.body) || !text(a.attribution))
        return null;
      const safeHref =
        typeof a.profileHref === "string" &&
        /^\/professionals\/[0-9a-f-]{36}$/i.test(a.profileHref) &&
        uuid(a.profileHref.slice("/professionals/".length))
          ? a.profileHref
          : undefined;
      answers.push({
        id: a.id,
        body: a.body,
        attribution: a.attribution,
        ...(safeHref ? { profileHref: safeHref } : {}),
      });
    }
    questions.push({ ...q, answers });
  }
  return { catalog: cats, questions };
}
export function parseMemberQa(raw: unknown): MemberQaWorkspace | null {
  if (
    !isRecord(raw) ||
    typeof raw.eligible !== "boolean" ||
    !Number.isSafeInteger(raw.page) ||
    Number(raw.page) < 1 ||
    typeof raw.hasNext !== "boolean" ||
    !Array.isArray(raw.questions) ||
    !Array.isArray(raw.answers)
  )
    return null;
  const cats = catalog(raw.catalog);
  if (!cats) return null;
  const questions = [];
  for (const q of raw.questions) {
    if (!isRecord(q) || !uuid(q.id) || !text(q.title) || !text(q.categoryId))
      return null;
    questions.push({ id: q.id, title: q.title, categoryId: q.categoryId });
  }
  const detail = raw.question === null ? null : question(raw.question);
  if (raw.question !== null && !detail) return null;
  const answers: OwnQaAnswer[] = [];
  for (const a of raw.answers) {
    if (
      !isRecord(a) ||
      !uuid(a.id) ||
      !uuid(a.questionId) ||
      !text(a.body) ||
      (a.parentStatus !== undefined &&
        !["pending", "published", "hidden", "rejected"].includes(
          String(a.parentStatus),
        )) ||
      !["pending", "published", "rejected", "hidden"].includes(
        String(a.status),
      ) ||
      !Number.isSafeInteger(a.version) ||
      Number(a.version) < 1
    )
      return null;
    answers.push({
      id: a.id,
      questionId: a.questionId,
      body: a.body,
      status: a.status as OwnQaAnswer["status"],
      ...(a.parentStatus === undefined
        ? {}
        : { parentStatus: a.parentStatus as OwnQaAnswer["parentStatus"] }),
      version: Number(a.version),
    });
  }
  return {
    eligible: raw.eligible,
    catalog: cats,
    questions,
    question: detail,
    answers,
    page: Number(raw.page),
    hasNext: raw.hasNext,
  };
}
export function parseQuestionPayload(
  raw: unknown,
  cats: readonly { id: string }[],
): QuestionSubmission | null {
  if (
    !isRecord(raw) ||
    Object.keys(raw).length !== 4 ||
    !Object.keys(raw).every((k) =>
      ["requestId", "title", "categoryId", "body"].includes(k),
    ) ||
    !uuid(raw.requestId)
  )
    return null;
  const p = parseQuestion(
    { title: raw.title, categoryId: raw.categoryId, body: raw.body },
    cats,
  );
  return p.ok ? { ...p.question, requestId: raw.requestId } : null;
}
export function parseAnswerPayload(raw: unknown): AnswerSubmission | null {
  if (
    !isRecord(raw) ||
    !Object.keys(raw).every((k) =>
      ["questionId", "body", "version"].includes(k),
    ) ||
    !uuid(raw.questionId) ||
    ("version" in raw &&
      (!Number.isSafeInteger(raw.version) || Number(raw.version) < 1))
  )
    return null;
  const body = parseAnswer(raw.body);
  return body
    ? {
        questionId: raw.questionId,
        body,
        ...("version" in raw ? { version: Number(raw.version) } : {}),
      }
    : null;
}
