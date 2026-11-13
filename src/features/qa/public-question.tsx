"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { safeQaReturn } from "@/validation/qa";

import { useSessionCategories } from "@/features/member/demo-session";
import { isSessionQuestionId } from "@/domain/qa";
import { publicSessionQuestions } from "@/domain/qa-session";
import { useDemoSession } from "@/features/member/demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { QuestionView } from "./question-view";

export function PublicQuestionPage({
  id,
  returnTo,
}: {
  id: string;
  returnTo: string;
}) {
  const { state } = useDemoSession();
  const categories = useSessionCategories();
  const params = useSearchParams();
  const backTo = safeQaReturn(params.get("returnTo") ?? returnTo, categories);
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
        <Link className="text-link" href={backTo}>
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
        <Link className="button" href={backTo}>
          Back to questions
        </Link>
      </div>
    );

  const category = categories.find((c) => c.id === question.categoryId);

  return (
    <QuestionView question={question} category={category} returnTo={backTo} />
  );
}
