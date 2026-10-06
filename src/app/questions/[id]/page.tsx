import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isSessionQuestionId } from "@/domain/qa";
import { loadQuestion } from "@/features/qa/load-question";
import { PublicQuestionPage } from "@/features/qa/public-question";
import { safeQaReturn } from "@/validation/qa";
interface QuestionPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}
export async function generateMetadata({
  params,
}: QuestionPageProps): Promise<Metadata> {
  const { id } = await params;
  const question = isSessionQuestionId(id) ? null : await loadQuestion(id);
  if (!isSessionQuestionId(id) && !question) notFound();
  return {
    title: question
      ? question.title + " | Demo Q&A"
      : "Session question | Demo Q&A",
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
  if (!isSessionQuestionId(id) && !(await loadQuestion(id))) notFound();
  return <PublicQuestionPage id={id} returnTo={safeQaReturn(query.returnTo)} />;
}
