"use client";
import Link from "next/link";
import { categories } from "@/domain/categories";
import { isSessionQuestionId } from "@/domain/qa";
import { publicSessionQuestions } from "@/domain/qa-session";
import { useDemoSession } from "@/features/member/demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { AnswersView } from "./answers-view";
export function PublicQuestionPage({
  id,
  returnTo,
}: {
  id: string;
  returnTo: string;
}) {
  const { state } = useDemoSession();
  const ready = useDemoReady();
  if (!ready && isSessionQuestionId(id))
    return (
      <div className="container qa-page qa-reading">
        <h1>Community question</h1>
        <p role="status">Loading question…</p>
        <noscript>
          <p>
            JavaScript is required for session-created questions. Published
            content remains available.
          </p>
        </noscript>
        <Link className="text-link" href={returnTo}>
          Back to questions
        </Link>
      </div>
    );
  const question = publicSessionQuestions(state).find((item) => item.id === id);
  if (!question)
    return (
      <div className="container result-state">
        <h1>Question unavailable</h1>
        <p>
          Only published questions can be viewed. Refresh or reset restores
          published content and clears session-created questions and decisions.
        </p>
        <Link className="button" href={returnTo}>
          Back to questions
        </Link>
      </div>
    );
  return (
    <div className="container qa-page qa-reading">
      <Link className="text-link" href={returnTo}>
        ← Back to questions
      </Link>
      <header className="page-heading qa-question-heading">
        <p className="qa-meta">
          {
            categories.find((category) => category.id === question.categoryId)
              ?.name
          }
        </p>
        <h1>{question.title}</h1>
      </header>
      <article aria-label="Question" className="qa-question-body">
        <h2>The question</h2>
        <p>{question.body}</p>
      </article>
      <AnswersView answers={question.answers} />
      <div className="qa-form-footer">
        <Link className="text-link" href={returnTo}>
          Back to questions
        </Link>
        <Link
          className="button"
          href={`/questions/ask?${new URLSearchParams({ returnTo })}`}
        >
          Ask a question
        </Link>
      </div>
    </div>
  );
}
