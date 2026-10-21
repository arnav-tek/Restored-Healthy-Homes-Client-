"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSessionCategories } from "@/features/member/demo-session";
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
  const categories = useSessionCategories();
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
      {/* Queue Switcher Summary Cards */}
      <nav className="qa-queue-nav" aria-label="Q&A queues">
        {(["questions", "answers"] as const).map((queue) => {
          const isSelected = query.queue === queue;
          const pendingCount = (queue === "questions" ? questions : answers).filter(
            (item) => item.status === "pending",
          ).length;
          const totalCount = (queue === "questions" ? questions : answers).length;

          return (
            <Link
              key={queue}
              aria-current={isSelected ? "page" : undefined}
              aria-label={`${queue === "questions" ? "Questions" : "Answers"} (${pendingCount} pending)`}
              href={href({ queue, question: "", answer: "" })}
              className={`qa-queue-card ${isSelected ? "is-selected" : ""}`}
            >
              <div className="qa-queue-card-header">
                <span className="qa-queue-card-title">
                  {queue === "questions" ? "Questions" : "Answers"}
                </span>
                <span className={`qa-pending-badge ${pendingCount > 0 ? "has-pending" : ""}`}>
                  {pendingCount} pending
                </span>
              </div>
              <div className="qa-queue-card-meta">
                <span className="qa-queue-count">{totalCount} total in queue</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {reviewing ? (
        <div className="review-detail-container">
          <Link className="text-link workspace-back-link" href={href({ question: "", answer: "" })}>
            ← Back to {query.queue} queue
          </Link>
          {!question || (query.queue === "answers" && !answer) ? (
            <div className="workspace-empty">
              <h2>This session record is unavailable</h2>
              <p>Return to the queue after reset or refresh.</p>
            </div>
          ) : (
            <>
              <article className="panel admin-detail-card qa-question-body">
                <div className="qa-detail-meta">
                  <span className="qa-category-tag">
                    {
                      categories.find((item) => item.id === question.categoryId)
                        ?.name
                    }
                  </span>
                  <span className="qa-source-tag">
                    {question.source === "session"
                      ? "Visitor submission"
                      : "Published question"}
                  </span>
                  <span
                    className={`admin-status-badge badge-${
                      question.status === "published"
                        ? "approved"
                        : question.status === "pending"
                          ? "pending"
                          : "rejected"
                    }`}
                  >
                    Question: {question.status}
                  </span>
                </div>
                <h2 className="admin-detail-heading">{question.title}</h2>
                <div className="qa-body-card">
                  <p className="qa-plain-text">{question.body}</p>
                </div>
              </article>

              {answer && (
                <article className="panel admin-detail-card qa-answer-card">
                  <div className="qa-detail-meta">
                    <span className="qa-source-tag">Professional Response</span>
                    <span
                      className={`admin-status-badge badge-${
                        answer.status === "published"
                          ? "approved"
                          : answer.status === "pending"
                            ? "pending"
                            : "rejected"
                      }`}
                    >
                      Answer: {answer.status}
                    </span>
                  </div>
                  <h3 className="admin-subheading">Answer by {answer.attribution}</h3>
                  <p className="qa-meta">
                    Professional · Answer status: {answer.status}
                  </p>
                  <div className="qa-body-card">
                    <p className="qa-plain-text">{answer.body}</p>
                  </div>
                  <p className="field-help">
                    The first eligible session response is reviewed before later responses. An answer appears publicly only when both it and its parent
                    question are published.
                  </p>
                </article>
              )}

              {question.status === "published" && (
                <div className="public-link-wrap">
                  <Link className="text-link" href={`/questions/${question.id}`}>
                    View public session question ↗
                  </Link>
                </div>
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
        </div>
      ) : (
        <>
          <div className="admin-filter-card">
            <QaWorkspaceFilters area="admin" />
          </div>

          <p role="status" className="result-count">
            {query.queue === "questions"
              ? matchingQuestions.length
              : matchingAnswers.length}{" "}
            matching {query.queue}
          </p>

          <ol className="qa-cards-list">
            {query.queue === "questions"
              ? matchingQuestions.map((item) => (
                  <li key={item.id}>
                    <article className="qa-record-card">
                      <div className="qa-card-meta-row">
                        <span className="qa-category-tag">
                          {
                            categories.find(
                              (category) => category.id === item.categoryId,
                            )?.name
                          }
                        </span>
                        <span
                          className={`admin-status-badge badge-${
                            item.status === "published"
                              ? "approved"
                              : item.status === "pending"
                                ? "pending"
                                : "rejected"
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="qa-source-tag">
                          {item.source === "session"
                            ? "Visitor submission"
                            : "Published content"}
                        </span>
                      </div>
                      <h3 className="qa-card-title">
                        <Link href={href({ question: item.id })}>
                          Review {item.title}
                        </Link>
                      </h3>
                      <p className="qa-card-preview">{item.body.slice(0, 150)}…</p>
                      <div className="qa-card-footer">
                        <Link
                          href={href({ question: item.id })}
                          className="table-action-link"
                        >
                          Moderate question <ArrowRight size={13} aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  </li>
                ))
              : matchingAnswers.map((item) => (
                  <li key={item.id}>
                    <article className="qa-record-card">
                      <div className="qa-card-meta-row">
                        <span className="qa-category-tag">
                          {
                            categories.find(
                              (category) =>
                                category.id ===
                                questions.find(
                                  (parent) => parent.id === item.questionId,
                                )?.categoryId,
                            )?.name
                          }
                        </span>
                        <span
                          className={`admin-status-badge badge-${
                            item.status === "published"
                              ? "approved"
                              : item.status === "pending"
                                ? "pending"
                                : "rejected"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <h3 className="qa-card-title">
                        <Link href={href({ answer: item.id })}>
                          Review answer by {item.attribution}
                        </Link>
                      </h3>
                      <p className="qa-card-parent-ref">
                        Parent:{" "}
                        <strong>
                          {
                            questions.find(
                              (parent) => parent.id === item.questionId,
                            )?.title
                          }
                        </strong>{" "}
                        ({
                          questions.find(
                            (parent) => parent.id === item.questionId,
                          )?.status
                        })
                      </p>
                      <p className="qa-card-preview">{item.body.slice(0, 150)}…</p>
                      <div className="qa-card-footer">
                        <Link
                          href={href({ answer: item.id })}
                          className="table-action-link"
                        >
                          Moderate answer <ArrowRight size={13} aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  </li>
                ))}
          </ol>

          {!(query.queue === "questions"
            ? matchingQuestions.length
            : matchingAnswers.length) && (
            <div className="workspace-empty">
              <h2>No {query.queue} match</h2>
              <p>
                Clear filters or submit content to explore review.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
