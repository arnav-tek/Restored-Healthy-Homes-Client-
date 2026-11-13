import { applicationMode } from "@/domain/config";
import { inquiryUuid } from "@/validation/connected-inquiry";
import { connectedQa } from "@/data/supabase/qa";
import { ConnectedQuestion } from "@/features/qa/connected-questions";
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
  if (applicationMode(process.env) === "staging") {
    if (!inquiryUuid.test(id)) notFound();
    let question;
    try {
      question = await connectedQa.getPublicQuestion(id);
    } catch {
      return {
        title: "Question unavailable",
        robots: { index: false, follow: false },
      };
    }
    if (!question) notFound();
    return {
      title: question.title,
      description: "Published healthy-home service question and answers.",
      robots: { index: false, follow: false },
    };
  }
  const question = isSessionQuestionId(id) ? null : await loadQuestion(id);
  if (!isSessionQuestionId(id) && !question) notFound();
  return {
    title: question ? question.title : "Community question",
    description: "Questions and answers about healthy-home services.",
    robots: { index: false, follow: false },
  };
}
export default async function QuestionPage({
  params,
  searchParams,
}: QuestionPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (applicationMode(process.env) === "staging") {
    if (!inquiryUuid.test(id)) notFound();
    return <ConnectedQuestion id={id} returnTo={query.returnTo} />;
  }
  if (!isSessionQuestionId(id) && !(await loadQuestion(id))) notFound();
  return <PublicQuestionPage id={id} returnTo={safeQaReturn(query.returnTo)} />;
}
