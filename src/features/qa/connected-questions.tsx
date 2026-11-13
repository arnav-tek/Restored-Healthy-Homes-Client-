import Link from "next/link";
import { loadPublicQa, connectedQa } from "@/data/supabase/qa";
import { parseQaQuery, qaHref, safeQaReturn } from "@/validation/qa";
import type { RawSearchParams } from "@/validation/directory";
import { searchPublicQuestions } from "@/domain/qa";
import { QuestionsView } from "./questions-view";
import { QuestionView } from "./question-view";
import { ConnectedQuestionForm } from "./connected-question-form";
import { notFound } from "next/navigation";
export async function ConnectedQuestions({
  params,
}: {
  params: RawSearchParams;
}) {
  let data;
  try {
    data = await loadPublicQa();
  } catch {}
  if (!data)
    return (
      <QuestionsView
        categories={[]}
        query={{ q: "", category: "", page: 1 }}
        errors={{}}
        unavailable
        returnTo="/questions"
      />
    );
  const parsed = parseQaQuery(params, data.catalog),
    results = Object.keys(parsed.errors).length
      ? undefined
      : searchPublicQuestions(data.questions, parsed.query, data.catalog);
  return (
    <QuestionsView
      categories={data.catalog}
      query={parsed.query}
      errors={parsed.errors}
      unavailable={false}
      results={results}
      returnTo={qaHref({
        ...parsed.query,
        page: results?.page ?? parsed.query.page,
      })}
    />
  );
}
export async function ConnectedAsk({
  returnTo,
}: {
  returnTo?: string | string[];
}) {
  let data;
  try {
    data = await loadPublicQa();
  } catch {}
  if (!data)
    return (
      <div className="container result-state">
        <h1>Questions are temporarily unavailable</h1>
        <p>The form could not be loaded. Please try again later.</p>
        <Link href="/questions/ask">Try again</Link>
      </div>
    );
  return (
    <div className="container qa-page qa-reading">
      <header className="page-heading">
        <h1>Ask a question</h1>
        <p>
          Ask a service or home-project question. Submissions are saved for
          review.
        </p>
      </header>
      <ConnectedQuestionForm
        catalog={data.catalog.filter((c) => c.active)}
        returnTo={safeQaReturn(returnTo, data.catalog)}
      />
    </div>
  );
}
export async function ConnectedQuestion({
  id,
  returnTo,
}: {
  id: string;
  returnTo?: string | string[];
}) {
  let question, data;
  try {
    question = await connectedQa.getPublicQuestion(id);
    data = await loadPublicQa(id);
  } catch {
    return (
      <div className="container result-state">
        <h1>Question unavailable</h1>
        <p>
          The question service could not be reached. Please try again later.
        </p>
        <Link href="/questions">Back to questions</Link>
      </div>
    );
  }
  if (!question) notFound();
  return (
    <>
      <QuestionView
        question={question}
        category={data.catalog.find((c) => c.id === question.categoryId)}
        returnTo={safeQaReturn(returnTo, data.catalog)}
      />
      <div className="container section">
        <Link className="text-link" href={`/member/questions/${id}`}>
          Specialists: open this question in your category inbox
        </Link>
      </div>
    </>
  );
}
