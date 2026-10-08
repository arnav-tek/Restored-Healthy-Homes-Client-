"use client";
import Link from "next/link";
import { categories } from "@/domain/categories";
import { ownQaAnswers, publicSessionQuestions } from "@/domain/qa-session";
import { searchPublicQuestions } from "@/domain/qa";
import { useDemoSession } from "@/features/member/demo-session";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
import { QaWorkspaceFilters } from "./workspace-filters";
import { AnswersView } from "./answers-view";
import { AnswerForm } from "./answer-form";
export function MemberQa({
  memberId,
  disabled,
}: {
  memberId: string;
  disabled: boolean;
}) {
  const { state } = useDemoSession();
  const { query, href } = useDashboardNavigation("member");
  const questions = publicSessionQuestions(state);
  const selected = questions.find((question) => question.id === query.question);
  const own = ownQaAnswers(state, memberId);
  // Search uses the same published-only selector as public Q&A; all matching pages are listed here.
  const matching = questions.filter(
    (question) =>
      searchPublicQuestions([question], {
        q: query.q,
        category: query.category,
        page: 1,
      }).total > 0,
  );
  return (
    <div className="qa-workspace">
      <p className="field-help">
        Approved professionals with an active membership may answer questions. One answer is allowed per professional for each question.
      </p>
      {query.question ? (
        <>
          <Link className="text-link" href={href({ question: "" })}>
            ← Back to member questions
          </Link>
          {selected ? (
            <>
              <article className="qa-question-body">
                <p className="qa-meta">
                  {
                    categories.find(
                      (category) => category.id === selected.categoryId,
                    )?.name
                  }
                </p>
                <h2>{selected.title}</h2>
                <p>{selected.body}</p>
              </article>
              <AnswersView answers={selected.answers} />
              <AnswerForm
                key={`${memberId}-${selected.id}`}
                memberId={memberId}
                questionId={selected.id}
                disabled={disabled}
              />
            </>
          ) : (
            <p className="workspace-empty">
              This question is not currently published. Return to the question
              list.
            </p>
          )}
        </>
      ) : (
        <>
          <QaWorkspaceFilters area="member" />
          <p role="status">{matching.length} published questions</p>
          <ol className="qa-list">
            {matching.map((question) => (
              <li key={question.id}>
                <article>
                  <p className="qa-meta">
                    {
                      categories.find(
                        (category) => category.id === question.categoryId,
                      )?.name
                    }
                  </p>
                  <h3>
                    <Link href={href({ question: question.id })}>
                      {question.title}
                    </Link>
                  </h3>
                  <p>{question.answers.length} published answers</p>
                </article>
              </li>
            ))}
          </ol>
          {!matching.length && (
            <p className="workspace-empty">
              No published questions match. Clear the filters to explore other
              samples.
            </p>
          )}
        </>
      )}
      <section
        className="panel qa-own-answers"
        aria-label="Your submitted answers"
      >
        <h2>Your submitted answers</h2>
        {!own.length ? (
          <p>No answers submitted for this member yet.</p>
        ) : (
          own.map((answer) => (
            <article className="qa-own-answer" key={answer.id}>
              <p>
                <strong>
                  {questions.find(
                    (question) => question.id === answer.questionId,
                  )?.title ?? "Question currently unavailable"}
                </strong>
              </p>
              <p>
                Answer status: <strong>{answer.status}</strong>
              </p>
              <p className="qa-plain-text">{answer.body}</p>
              {!questions.some(
                (question) => question.id === answer.questionId,
              ) && (
                <p className="field-help">
                  The parent question is not public; this answer’s individual
                  status is unchanged.
                </p>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
