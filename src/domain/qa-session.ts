import type { DemoSession, DemoMemberRecord } from "./demo-member";
import type {
  PublicQuestion,
  QuestionRecord,
  PublishableAnswer,
  ModerationStatus,
} from "./qa";
import { projectQaContent } from "./qa";
import { isPubliclyEligible } from "./listing";
import { professionalForMember } from "./professional-association";
import { eligiblePublicIds } from "./public-session";
import { profileHref } from "../validation/profile";
import { parseAnswer, parseModerationNote } from "../validation/qa-moderation";

export interface QaDecision {
  status: "published" | "rejected";
  note: string;
}
export interface SessionAnswer extends PublishableAnswer {
  readonly authorId: string;
}
export interface QaSession {
  readonly snapshot: readonly PublicQuestion[];
  answers: readonly SessionAnswer[];
  questionDecisions: Record<string, QaDecision>;
  answerDecisions: Record<string, QaDecision>;
}
export interface ReviewQuestion extends QuestionRecord {
  source: "seed" | "session";
}
export interface ReviewAnswer extends PublishableAnswer {
  authorId: string | null;
  moderationNote: string;
}
export type QaAction =
  | { type: "submit-answer"; questionId: string; body: string }
  | {
      type: "moderate-question" | "moderate-answer";
      id: string;
      status: "published" | "rejected";
      note: string;
    };

/** Provisional demo answer policy; independent of certification/category membership. */
export function canMemberAnswer(member: DemoMemberRecord | undefined): boolean {
  return !!member && isPubliclyEligible(member);
}
export function createQaSession(
  snapshot: readonly PublicQuestion[],
): QaSession {
  return {
    snapshot: structuredClone(snapshot),
    answers: [],
    questionDecisions: {},
    answerDecisions: {},
  };
}
export function qaReviewQuestions(state: DemoSession): ReviewQuestion[] {
  return [
    ...state.qa.snapshot.map((question): ReviewQuestion => ({
      id: question.id,
      title: question.title,
      body: question.body,
      categoryId: question.categoryId,
      status: "published",
      moderationNote: "",
      source: "seed",
    })),
    ...state.questions.map((question): ReviewQuestion => ({
      ...question,
      moderationNote: "",
      source: "session",
    })),
  ].map((question) => {
    const decision = state.qa.questionDecisions[question.id];
    return decision
      ? { ...question, status: decision.status, moderationNote: decision.note }
      : question;
  });
}
export function qaReviewAnswers(state: DemoSession): ReviewAnswer[] {
  const answers: ReviewAnswer[] = [
    ...state.qa.snapshot.flatMap((question) =>
      question.answers.map((answer): ReviewAnswer => ({
        ...answer,
        questionId: question.id,
        status: "published",
        authorId: null,
        moderationNote: "",
      })),
    ),
    ...state.qa.answers.map((answer) => ({ ...answer, moderationNote: "" })),
  ];
  return answers.map((answer) => {
    const decision = state.qa.answerDecisions[answer.id];
    return decision
      ? { ...answer, status: decision.status, moderationNote: decision.note }
      : answer;
  });
}
export function publicSessionQuestions(state: DemoSession): PublicQuestion[] {
  const eligible = eligiblePublicIds(state);
  const answers = qaReviewAnswers(state).map((answer) => {
    if (!answer.authorId) {
      if (!answer.profileHref) return answer;
      const id = answer.profileHref.split("/").pop() ?? "";
      if (eligible.includes(id)) return answer;
      const { profileHref: previousHref, ...content } = answer;
      void previousHref;
      return content;
    }
    const member = state.records.find((item) => item.id === answer.authorId);
    const id = professionalForMember(answer.authorId, state.applicationId);
    const { profileHref: previousHref, ...content } = answer;
    void previousHref;
    return {
      ...content,
      ...(member && isPubliclyEligible(member) ? { attribution: member.profile.businessName } : {}),
      ...(member &&
      isPubliclyEligible(member) &&
      id &&
      eligible.includes(id)
        ? { profileHref: profileHref(id) }
        : {}),
    };
  });
  return qaReviewQuestions(state).flatMap((question) => {
    const projected = projectQaContent(question, answers);
    return projected ? [projected] : [];
  });
}
/** Member-facing projection never includes internal notes or other authors' drafts. */
export function ownQaAnswers(state: DemoSession, memberId: string) {
  return qaReviewAnswers(state)
    .filter((answer) => answer.authorId === memberId)
    .map(({ id, questionId, body, status }) => ({
      id,
      questionId,
      body,
      status,
    }));
}
/** Public, category-matched inbox; no visitor identity or email transport. */
export function memberQuestionInbox(
  state: DemoSession,
  memberId: string,
): PublicQuestion[] {
  const member = state.records.find((item) => item.id === memberId);
  return canMemberAnswer(member)
    ? publicSessionQuestions(state).filter((question) =>
        member!.profile.categoryIds.includes(question.categoryId),
      )
    : [];
}
export function canPublishSessionAnswer(
  state: DemoSession,
  answerId: string,
): boolean {
  const target = state.qa.answers.find((answer) => answer.id === answerId);
  if (!target) return false;
  const status = (answer: SessionAnswer) =>
    state.qa.answerDecisions[answer.id]?.status ?? answer.status;
  if (
    state.qa.answers.some(
      (answer) =>
        answer.questionId === target.questionId &&
        answer.id !== answerId &&
        status(answer) === "published",
    )
  )
    return false;
  return (
    state.qa.answers.find(
      (answer) =>
        answer.questionId === target.questionId &&
        (answer.id === answerId || status(answer) !== "rejected"),
    )?.id === answerId
  );
}
export function answerSubmissionError(
  state: DemoSession,
  questionId: string,
): string | null {
  if (
    !canMemberAnswer(
      state.records.find((member) => member.id === state.selectedId),
    )
  )
    return "Answering requires approval, an active subscription and no suspension.";
  if (
    !qaReviewQuestions(state).some(
      (question) =>
        question.id === questionId && question.status === "published",
    )
  )
    return "This question is not currently available for answers.";
  if (
    !memberQuestionInbox(state, state.selectedId).some(
      (question) => question.id === questionId,
    )
  )
    return "This question is outside your listed categories.";
  if (
    state.qa.answers.some(
      (answer) =>
        answer.questionId === questionId &&
        answer.authorId === state.selectedId,
    )
  )
    return "You already submitted an answer to this question. Editing and deletion are not available in this phase.";
  return null;
}
export function reduceQaAction(
  state: DemoSession,
  action: QaAction,
): DemoSession {
  if (action.type === "submit-answer") {
    const body = parseAnswer(action.body);
    if (!body || answerSubmissionError(state, action.questionId)) return state;
    const member = state.records.find((item) => item.id === state.selectedId)!;
    const answer: SessionAnswer = {
      id: `demo-session-answer-${state.revision + 1}`,
      questionId: action.questionId,
      body,
      authorId: member.id,
      attribution: member.profile.businessName,
      status: "pending",
    };
    return {
      ...state,
      qa: { ...state.qa, answers: [...state.qa.answers, answer] },
      revision: state.revision + 1,
    };
  }
  const note = parseModerationNote(action.note);
  if (note === null || !["published", "rejected"].includes(action.status))
    return state;
  const isQuestion = action.type === "moderate-question";
  const record = (
    isQuestion ? qaReviewQuestions(state) : qaReviewAnswers(state)
  ).find((item) => item.id === action.id);
  if (
    !record ||
    (record.status === action.status && record.moderationNote === note)
  )
    return state;
  if (
    !isQuestion &&
    action.status === "published" &&
    state.qa.answers.some((answer) => answer.id === record.id) &&
    !canPublishSessionAnswer(state, record.id)
  )
    return {
      ...state,
      notice:
        "Review the first eligible response before publishing a later response.",
    };
  const key = isQuestion ? "questionDecisions" : "answerDecisions";
  return {
    ...state,
    qa: {
      ...state.qa,
      [key]: { ...state.qa[key], [record.id]: { status: action.status, note } },
    },
    revision: state.revision + 1,
  };
}
export function qaMatches(
  record: {
    categoryId: string;
    title: string;
    body: string;
    status: ModerationStatus;
  },
  filters: { q: string; category: string; qaStatus: string },
): boolean {
  return (
    (!filters.category || record.categoryId === filters.category) &&
    (filters.qaStatus === "all" || record.status === filters.qaStatus) &&
    `${record.title} ${record.body}`
      .toLocaleLowerCase("en-US")
      .includes(filters.q.toLocaleLowerCase("en-US"))
  );
}
