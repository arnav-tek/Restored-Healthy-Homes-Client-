import Link from "next/link";
import type { MemberQaWorkspace } from "@/domain/connected-qa";
import { ConnectedMemberNav } from "@/features/member/connected-member-nav";
import { ConnectedAnswerForm } from "./connected-answer-form";
export function MemberQaView({
  data,
  id,
  page = 1,
}: {
  data: MemberQaWorkspace;
  id?: string;
  page?: number;
}) {
  const own = id ? data.answers.find((a) => a.questionId === id) : undefined;
  return (
    <div className="container qa-page">
      <section id="private-account">
        <ConnectedMemberNav current="/member/questions" />
        <header className="page-heading">
          <h1>Category questions</h1>
          <p>
            Published questions in your listed categories. Answers require
            approval, active membership and no suspension. Credentials do not
            grant participation.
          </p>
        </header>
        {!data.eligible ? (
          <p className="workspace-empty">
            No category inbox is available until your listing is approved,
            active and unsuspended.
          </p>
        ) : id ? (
          <>
            <Link href="/member/questions">Back to category inbox</Link>
            {data.question ? (
              <>
                <h2>{data.question.title}</h2>
                <p className="qa-plain-text">{data.question.body}</p>
                {!own || own.status === "pending" ? (
                  <ConnectedAnswerForm
                    key={own?.version ?? "new"}
                    questionId={id}
                    initial={own?.body}
                    version={own?.version}
                  />
                ) : (
                  <p className="notice">
                    Your answer is {own.status}. Reviewed answers cannot be
                    edited. An administrator must restore an answer to pending
                    review before changes.
                  </p>
                )}
              </>
            ) : (
              <p className="workspace-empty">
                This published question is unavailable in your current
                categories.
              </p>
            )}
          </>
        ) : (
          <>
            <ol className="qa-list">
              {data.questions.map((q) => (
                <li key={q.id} className="qa-question-card">
                  <h2>
                    <Link href={`/member/questions/${q.id}`}>{q.title}</Link>
                  </h2>
                  <p>
                    {data.catalog.find((c) => c.id === q.categoryId)?.name ??
                      "Specialty"}
                  </p>
                </li>
              ))}
            </ol>
            {!data.questions.length && (
              <p className="workspace-empty">
                No published questions match your categories yet.
              </p>
            )}
            <nav aria-label="Category inbox pages">
              {page > 1 && (
                <Link href={`/member/questions?page=${page - 1}`}>
                  Previous page
                </Link>
              )}{" "}
              {data.hasNext && (
                <Link href={`/member/questions?page=${page + 1}`}>
                  Next page
                </Link>
              )}
            </nav>
          </>
        )}
        <section className="panel qa-own-answers">
          <h2>Your saved answers</h2>
          {data.answers.length ? (
            data.answers.map((a) => (
              <article key={a.id} className="qa-own-answer">
                <p>
                  Answer status: <strong>{a.status}</strong>
                </p>
                {a.status === "published" && a.parentStatus !== "published" && (
                  <p className="field-help">
                    This answer is not public because its parent question is{" "}
                    {a.parentStatus ?? "unavailable"}.
                  </p>
                )}
                <p className="qa-plain-text">{a.body}</p>
                <Link href={`/member/questions/${a.questionId}`}>
                  Open question
                </Link>
              </article>
            ))
          ) : (
            <p>No saved answers to show.</p>
          )}
        </section>
        <p className="field-help">
          Category alert events are recorded after question publication. Real
          email delivery remains disabled.
        </p>
      </section>
    </div>
  );
}
