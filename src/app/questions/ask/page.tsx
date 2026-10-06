import type { Metadata } from "next";
import { categories } from "@/domain/categories";
import { safeQaReturn } from "@/validation/qa";
import { QuestionForm } from "@/features/qa/question-form";
export const metadata: Metadata = {
  title: "Ask a question",
  robots: { index: false, follow: false },
};
export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  return (
    <div className="container qa-page qa-reading">
      <header className="page-heading">
        <h1>Ask a question</h1>
        <p>
          Try a service or home-project question. No account or contact details
          are needed.
        </p>
      </header>
      <QuestionForm
        catalog={categories.map(({ id, name }) => ({ id, name }))}
        returnTo={safeQaReturn(params.returnTo)}
      />
    </div>
  );
}
