import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories } from "@/domain/categories";
import { loadQuestion } from "@/features/qa/load-question";
import { safeQaReturn } from "@/validation/qa";
import { Notice } from "@/components/ui/notice";
interface QuestionPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}
export async function generateMetadata({
  params,
}: QuestionPageProps): Promise<Metadata> {
  const question = await loadQuestion((await params).id);
  if (!question) notFound();
  return {
    title: `${question.title} | Demo Q&A`,
    description:
      "Fictional question and sample answers. No clinical advice or real endorsements.",
    robots: { index: false, follow: false },
  };
}
export default async function QuestionPage({
  params,
  searchParams,
}: QuestionPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const question = await loadQuestion(id);
  if (!question) notFound();
  const returnTo = safeQaReturn(query.returnTo);
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
      <Notice>
        <strong>Fictional question and answers.</strong> Sample service
        discussions, not advice or endorsements. Professional names below are
        fictional.
      </Notice>
      <article aria-label="Question" className="qa-question-body">
        <h2>The question</h2>
        <p>{question.body}</p>
      </article>
      <section aria-labelledby="answers-heading" className="qa-answers">
        <h2 id="answers-heading">
          Published sample answers ({question.answers.length})
        </h2>
        {question.answers.length ? (
          question.answers.map((answer) => (
            <article key={answer.id} className="qa-answer">
              <h3>{answer.attribution}</h3>
              <p className="qa-meta">Fictional professional · Sample answer</p>
              <p>{answer.body}</p>
              {answer.profileHref && (
                <Link className="text-link" href={answer.profileHref}>
                  View fictional professional profile
                </Link>
              )}
            </article>
          ))
        ) : (
          <div className="workspace-empty">
            <h3>No published answers yet</h3>
            <p>
              This sample question is unanswered. Member answers and review
              controls are planned for a later demo phase; no notification has
              been sent.
            </p>
          </div>
        )}
      </section>
      <div className="qa-form-footer">
        <Link className="text-link" href={returnTo}>
          Back to questions
        </Link>
        <Link
          className="button"
          href={`/questions/ask?${new URLSearchParams({ returnTo })}`}
        >
          Ask a demo question
        </Link>
      </div>
    </div>
  );
}
