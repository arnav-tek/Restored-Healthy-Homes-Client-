"use client";
import Link from "next/link";
import { categories } from "@/domain/categories";
import {
  qaReviewQuestions,
  qaReviewAnswers,
  qaMatches,
} from "@/domain/qa-session";
import { useDemoSession } from "@/features/member/demo-session";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
import { QaWorkspaceFilters } from "./workspace-filters";
import { QaModerationForm } from "./moderation-form";
export function AdminQa() {
  const { state } = useDemoSession();
  const { query, href } = useDashboardNavigation("admin");
  const questions = qaReviewQuestions(state);
  const answers = qaReviewAnswers(state);
  const answer =
    query.queue === "answers"
      ? answers.find((item) => item.id === query.answer)
      : undefined;
  const question = questions.find(
    (item) => item.id === (answer?.questionId ?? query.question),
  );
  const reviewing =
    query.queue === "answers" ? !!query.answer : !!query.question;
  const matchingQuestions = questions.filter((item) => qaMatches(item, query));
  const matchingAnswers = answers.filter((item) => {
    const parent = questions.find(
      (question) => question.id === item.questionId,
    );
    return (
      !!parent &&
      qaMatches(
        {
          ...item,
          categoryId: parent.categoryId,
          title: `${parent.title} ${item.attribution}`,
        },
        query,
      )
    );
  });
  return (
    <div className="qa-workspace">
      <p className="field-help">
        These controls simulate moderation, not authentication or production
        authorization. Refresh or confirmed reset restores the original samples.
        Question and answer decisions are independent.
      </p>
      <nav className="qa-queue-nav" aria-label="Q&A queues">
        {(["questions", "answers"] as const).map((queue) => (
          <Link
            key={queue}
            aria-current={query.queue === queue ? "page" : undefined}
            href={href({ queue, question: "", answer: "" })}
          >
            {queue === "questions" ? "Questions" : "Answers"} (
            {
              (queue === "questions" ? questions : answers).filter(
                (item) => item.status === "pending",
              ).length
            }{" "}
            pending)
          </Link>
        ))}
      </nav>
      {reviewing ? (
        <>
          <Link className="text-link" href={href({ question: "", answer: "" })}>
            ← Back to {query.queue} queue
          </Link>
          {!question || (query.queue === "answers" && !answer) ? (
            <p className="workspace-empty">
              This session record is unavailable. Return to the queue after
              reset or refresh.
            </p>
          ) : (
            <>
              <article className="qa-question-body">
                <p className="qa-meta">
                  {
                    categories.find((item) => item.id === question.categoryId)
                      ?.name
                  }{" "}
                  ·{" "}
                  {question.source === "session"
                    ? "Visitor submission"
                    : "Published question"}
                </p>
                <h2>{question.title}</h2>
                <p>
                  Question status: <strong>{question.status}</strong>
                </p>
                <p className="qa-plain-text">{question.body}</p>
              </article>
              {answer && (
                <article className="qa-answer">
                  <h3>Answer by {answer.attribution}</h3>
                  <p className="qa-meta">
                    Professional · Answer status: {answer.status}
                  </p>
                  <p className="qa-plain-text">{answer.body}</p>
                  <p className="field-help">
                    An answer appears publicly only when both it and its parent
                    question are published.
                  </p>
                </article>
              )}
              {question.status === "published" && (
                <Link className="text-link" href={`/questions/${question.id}`}>
                  View public session question
                </Link>
              )}
              <QaModerationForm
                key={answer?.id ?? question.id}
                kind={answer ? "answer" : "question"}
                id={answer?.id ?? question.id}
                title={question.title}
                status={answer?.status ?? question.status}
                note={answer?.moderationNote ?? question.moderationNote}
              />
            </>
          )}
        </>
      ) : (
        <>
          <QaWorkspaceFilters area="admin" />
          <p role="status">
            {query.queue === "questions"
              ? matchingQuestions.length
              : matchingAnswers.length}{" "}
            matching {query.queue}
          </p>
          <ol className="qa-list">
            {query.queue === "questions"
              ? matchingQuestions.map((item) => (
                  <li key={item.id}>
                    <article>
                      <p className="qa-meta">
                        {
                          categories.find(
                            (category) => category.id === item.categoryId,
                          )?.name
                        }{" "}
                        · {item.status} ·{" "}
                        {item.source === "session"
                          ? "Visitor"
                          : "Published content"}
                      </p>
                      <h3>
                        <Link href={href({ question: item.id })}>
                          Review {item.title}
                        </Link>
                      </h3>
                    </article>
                  </li>
                ))
              : matchingAnswers.map((item) => (
                  <li key={item.id}>
                    <article>
                      <p className="qa-meta">
                        {item.status} ·{" "}
                        {
                          categories.find(
                            (category) =>
                              category.id ===
                              questions.find(
                                (parent) => parent.id === item.questionId,
                              )?.categoryId,
                          )?.name
                        }
                      </p>
                      <h3>
                        <Link href={href({ answer: item.id })}>
                          Review answer by {item.attribution}
                        </Link>
                      </h3>
                      <p>
                        {
                          questions.find(
                            (parent) => parent.id === item.questionId,
                          )?.title
                        }{" "}
                        · Parent:{" "}
                        {
                          questions.find(
                            (parent) => parent.id === item.questionId,
                          )?.status
                        }
                      </p>
                    </article>
                  </li>
                ))}
          </ol>
          {!(query.queue === "questions"
            ? matchingQuestions.length
            : matchingAnswers.length) && (
            <p className="workspace-empty">
              No {query.queue} match. Clear filters or submit content to explore review.
            </p>
          )}
        </>
      )}
    </div>
  );
}
