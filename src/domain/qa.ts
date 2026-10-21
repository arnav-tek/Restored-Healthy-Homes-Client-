import { categories } from "./categories";

export type ModerationStatus = "pending" | "published" | "rejected";
export interface QuestionFields {
  title: string;
  categoryId: string;
  body: string;
}
export interface QuestionRecord extends QuestionFields {
  readonly id: string;
  readonly status: ModerationStatus;
  readonly moderationNote: string;
}
export interface AnswerRecord {
  readonly id: string;
  readonly questionId: string;
  readonly body: string;
  readonly attribution: string;
  readonly professionalId?: string;
  readonly status: ModerationStatus;
  readonly moderationNote: string;
}
export interface PublicAnswer {
  id: string;
  body: string;
  attribution: string;
  profileHref?: string;
}
export interface PublicQuestion extends QuestionFields {
  id: string;
  answers: PublicAnswer[];
}
export interface PublicQuestionSummary {
  id: string;
  title: string;
  categoryId: string;
  excerpt: string;
  answerCount: number;
}
export interface DemoQuestionSubmission extends QuestionFields {
  readonly id: string;
  readonly status: "pending";
}
export interface QaQuery {
  q: string;
  category: string;
  page: number;
}
export interface QaResults {
  items: PublicQuestionSummary[];
  total: number;
  page: number;
  pages: number;
}
export const QA_PAGE_SIZE = 6;
export const isSessionQuestionId = (id: string) =>
  /^demo-session-question-[1-9]\d{0,9}$/.test(id);
export interface PublishableAnswer extends PublicAnswer {
  questionId: string;
  status: ModerationStatus;
}
export function projectQaContent(
  question: QuestionRecord,
  answers: readonly PublishableAnswer[],
): PublicQuestion | null {
  if (question.status !== "published") return null;
  return {
    id: question.id,
    title: question.title,
    categoryId: question.categoryId,
    body: question.body,
    answers: answers
      .filter(
        (answer) =>
          answer.questionId === question.id && answer.status === "published",
      )
      .map((answer) => ({
        id: answer.id,
        body: answer.body,
        attribution: answer.attribution,
        ...(answer.profileHref ? { profileHref: answer.profileHref } : {}),
      })),
  };
}

/** Publication is checked before any content or private fields are projected. */
export function projectPublicQuestion(
  question: QuestionRecord,
  answers: readonly AnswerRecord[],
  eligibleProfileHref: (id: string) => string | undefined,
): PublicQuestion | null {
  if (question.status !== "published") return null;
  return projectQaContent(
    question,
    answers.map((answer) => {
      const href = answer.professionalId
        ? eligibleProfileHref(answer.professionalId)
        : undefined;
      return {
        id: answer.id,
        questionId: answer.questionId,
        status: answer.status,
        body: answer.body,
        attribution: answer.attribution,
        ...(href ? { profileHref: href } : {}),
      };
    }),
  );
}

/** Accept public projections only: hidden content never participates in matching/counts. */
export function searchPublicQuestions(
  questions: readonly PublicQuestion[],
  query: QaQuery,
  catalog: readonly { id: string; name: string }[] = categories,
): QaResults {
  const needle = query.q.toLocaleLowerCase("en-US");
  const matches = questions
    .filter((question) => {
      if (query.category && question.categoryId !== query.category)
        return false;
      const categoryName =
        catalog.find((category) => category.id === question.categoryId)
          ?.name ?? "";
      return `${question.title} ${question.body} ${categoryName}`
        .toLocaleLowerCase("en-US")
        .includes(needle);
    })
    .sort(
      (a, b) =>
        a.title.localeCompare(b.title, "en") || a.id.localeCompare(b.id),
    );
  const pages = Math.max(1, Math.ceil(matches.length / QA_PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, query.page));
  return {
    total: matches.length,
    page,
    pages,
    items: matches
      .slice((page - 1) * QA_PAGE_SIZE, page * QA_PAGE_SIZE)
      .map((question) => ({
        id: question.id,
        title: question.title,
        categoryId: question.categoryId,
        excerpt:
          question.body.length > 170
            ? `${question.body.slice(0, 167)}…`
            : question.body,
        answerCount: question.answers.length,
      })),
  };
}
