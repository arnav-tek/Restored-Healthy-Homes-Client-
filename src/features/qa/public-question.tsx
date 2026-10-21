"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { safeQaReturn } from "@/validation/qa";
import { MessageSquare, HelpCircle, Search } from "lucide-react";
import { useSessionCategories } from "@/features/member/demo-session";
import { isSessionQuestionId } from "@/domain/qa";
import { publicSessionQuestions } from "@/domain/qa-session";
import { useDemoSession } from "@/features/member/demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { AnswersView } from "./answers-view";
import { CategoryIcon } from "./category-icons";

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
    <div className="qa-detail-page">
      <div className="qa-detail-container">
        {/* Top Navigation */}
        <div className="qa-detail-top-nav">
          <Link className="qa-back-link" href={backTo}>
            <span aria-hidden="true">← </span>Back to questions
          </Link>
        </div>

        {/* 2-Column Hero Area */}
        <div className="qa-detail-hero-grid">
          {/* Left Column (65%) */}
          <div className="qa-detail-main">
            {/* Category Badge */}
            <div className="qa-detail-category-badge">
              <span className="qa-detail-cat-icon-wrap" aria-hidden="true">
                <CategoryIcon id={question.categoryId} size={16} />
              </span>
              <span className="qa-detail-cat-name">
                {category?.name ?? "Specialist Directory"}
              </span>
            </div>

            {/* Title */}
            <h1 className="qa-detail-title">{question.title}</h1>

            {/* The Question Card */}
            <article aria-label="Question" className="qa-detail-question-card">
              <div className="qa-detail-question-header">
                <div className="qa-detail-question-icon" aria-hidden="true">
                  <MessageSquare size={18} />
                </div>
                <h2 className="qa-detail-question-heading">The question</h2>
              </div>
              <div className="qa-detail-question-body">
                <p>{question.body}</p>
              </div>
              <div className="qa-detail-question-meta">
                Asked in{" "}
                <strong className="qa-detail-question-category">
                  {category?.name ?? "Specialist Directory"}
                </strong>
              </div>
            </article>
          </div>

          {/* Right Column / Sidebar (35%) */}
          <aside aria-label="Related actions" className="qa-detail-sidebar">
            <div className="qa-sidebar-section">
              <div className="qa-sidebar-header">
                <div className="qa-sidebar-icon-wrap" aria-hidden="true">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className="qa-sidebar-heading">Have a similar question?</h3>
                  <p className="qa-sidebar-text">
                    Get answers from qualified professionals in our community.
                  </p>
                </div>
              </div>
              <Link
                className="qa-sidebar-btn"
                href={`/questions/ask?${new URLSearchParams({ returnTo })}`}
              >
                Ask a question <span aria-hidden="true">→</span>
              </Link>
            </div>

            <hr className="qa-sidebar-divider" aria-hidden="true" />

            <div className="qa-sidebar-section">
              <div className="qa-sidebar-header">
                <div className="qa-sidebar-icon-wrap" aria-hidden="true">
                  <Search size={20} />
                </div>
                <div>
                  <h3 className="qa-sidebar-heading">Explore more questions</h3>
                  <p className="qa-sidebar-text">
                    Browse real questions and answers about healthy-home
                    services, planning and costs.
                  </p>
                </div>
              </div>
              <Link className="qa-sidebar-link" href={returnTo || "/questions"}>
                View all questions <span aria-hidden="true">→</span>
              </Link>
            </div>
          </aside>
        </div>

        {/* Full-width Published Answers */}
        <AnswersView
          answers={question.answers}
          categoryName={category?.name}
        />

        {/* Bottom Navigation */}
        <div className="qa-detail-bottom-nav">
          <Link className="qa-back-link" href={returnTo}>
            <span aria-hidden="true">← </span>Back to questions
          </Link>
          <Link
            className="qa-bottom-ask-btn"
            href={`/questions/ask?${new URLSearchParams({ returnTo })}`}
          >
            Ask a question <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
