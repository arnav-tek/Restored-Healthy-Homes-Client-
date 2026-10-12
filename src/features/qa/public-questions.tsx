"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { categories } from "@/domain/categories";
import { QA_PAGE_SIZE, searchPublicQuestions, type QaQuery } from "@/domain/qa";
import { publicSessionQuestions } from "@/domain/qa-session";
import { useDemoSession } from "@/features/member/demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { qaHref, questionHref, type QaQueryErrors } from "@/validation/qa";
import { SearchForm } from "@/features/directory/search-form";
import { Button } from "@/components/ui/button";

import { CategoryIcon } from "./category-icons";

export function PublicQuestions({
  query,
  errors,
  unavailable,
}: {
  query: QaQuery;
  errors: QaQueryErrors;
  unavailable: boolean;
}) {
  const { state } = useDemoSession();
  const ready = useDemoReady();
  const router = useRouter();
  const results =
    !unavailable && !Object.keys(errors).length
      ? searchPublicQuestions(publicSessionQuestions(state), query)
      : undefined;
  const returnTo = qaHref({ ...query, page: results?.page ?? 1 });

  useEffect(() => {
    if (ready && results && results.page !== query.page)
      router.replace(returnTo, { scroll: false });
  }, [ready, results, query.page, returnTo, router]);

  return (
    <div className="container qa-page">
      {/* 1. Hero Section: 2-column layout */}
      <header className="qa-hero">
        <div className="qa-hero-left">
          <div className="qa-eyebrow section-tag">
            <span role="heading" aria-level={2}>Ask a Specialist</span>

          </div>
          <h1 className="qa-hero-title">
            Get expert advice
            <br />
            for a healthier home.
          </h1>
          <p className="qa-hero-desc">
            Explore real questions about healthy-home services and get insights
            from qualified professionals. Learn, compare and plan your next
            project with confidence.
          </p>
        </div>

        <div className="qa-hero-card">
          <div className="qa-benefit-item">
            <div className="qa-benefit-icon" aria-hidden="true">
              <MessageSquare size={20} strokeWidth={1.8} />
            </div>
            <div className="qa-benefit-content">
              <h2 className="qa-benefit-title">Ask real questions</h2>
              <p className="qa-benefit-text">
                Get answers from qualified professionals in our community.
              </p>
            </div>
          </div>

          <div className="qa-benefit-item">
            <div className="qa-benefit-icon" aria-hidden="true">
              <BookOpen size={20} strokeWidth={1.8} />
            </div>
            <div className="qa-benefit-content">
              <h2 className="qa-benefit-title">Learn from experience</h2>
              <p className="qa-benefit-text">
                See real questions and answers about services, planning and costs.
              </p>
            </div>
          </div>

          <div className="qa-benefit-item">
            <div className="qa-benefit-icon" aria-hidden="true">
              <ShieldCheck size={20} strokeWidth={1.8} />
            </div>
            <div className="qa-benefit-content">
              <h2 className="qa-benefit-title">Make better decisions</h2>
              <p className="qa-benefit-text">
                Get clarity before starting your home project.
              </p>
            </div>
          </div>

          <Link
            className="qa-hero-btn"
            href={`/questions/ask?${new URLSearchParams({ returnTo })}`}
          >
            Ask a question <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      {/* 2. Search and filter section: White rounded panel */}
      <div className="qa-search-panel">
        <SearchForm
          key={returnTo + JSON.stringify(errors)}
          action="/questions"
          label="Search questions"
          className="qa-filters"
        >
          <div className="qa-search-inputs-grid">
            <div className="search-field qa-input-field">
              <label htmlFor="qa-q" className="qa-field-label">
                Keyword
              </label>
              <div className="qa-input-wrap">
                <Search size={18} className="qa-input-icon" aria-hidden="true" />
                <input
                  id="qa-q"
                  name="q"
                  defaultValue={query.q}
                  maxLength={120}
                  placeholder="Search question titles and text..."
                  className="qa-input-control"
                  aria-invalid={!!errors.q}
                  aria-describedby={errors.q ? "qa-q-error" : undefined}
                />
              </div>
              {errors.q && (
                <p id="qa-q-error" className="field-error">
                  {errors.q}
                </p>
              )}
            </div>

            <div className="search-field qa-input-field">
              <label htmlFor="qa-category" className="qa-field-label">
                Category
              </label>
              <div className="qa-input-wrap">
                <LayoutGrid size={18} className="qa-input-icon" aria-hidden="true" />
                <select
                  id="qa-category"
                  name="category"
                  defaultValue={query.category}
                  className="qa-select-control"
                  aria-invalid={!!errors.category}
                  aria-describedby={
                    errors.category ? "qa-category-error" : undefined
                  }
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.category && (
                <p id="qa-category-error" className="field-error">
                  {errors.category}
                </p>
              )}
            </div>
          </div>

          <div className="qa-search-actions-row filter-actions">
            <Button type="submit" className="qa-search-btn">
              <Search size={16} aria-hidden="true" />
              <span>Search questions</span>
            </Button>
            <Link className="qa-clear-btn" href="/questions">
              <RotateCcw size={15} aria-hidden="true" />
              <span>Clear filters</span>
            </Link>
          </div>
        </SearchForm>
      </div>

      {/* 3. Published questions section */}
      <section aria-label="Question results" className="qa-results-section">
        {Object.keys(errors).length ? (
          <div className="result-state" role="alert">
            <h2>Check your search</h2>
            <p>
              {errors.page ??
                "Correct the highlighted filters to see questions."}
            </p>
            <Link className="text-link" href="/questions">
              Reset question search
            </Link>
          </div>
        ) : unavailable ? (
          <div className="result-state" role="alert">
            <h2>Questions are unavailable</h2>
            <p>The questions could not be loaded. Try this search again.</p>
            <Link className="button" href={returnTo}>
              Retry question search
            </Link>
          </div>
        ) : results ? (
          <>
            <div className="qa-results-header results-heading">
              <div className="qa-results-header-left">
                <h2>Published questions</h2>
                <p>
                  Browse questions from our community of homeowners and
                  professionals.
                </p>
              </div>
              <p aria-live="polite" className="qa-results-count">
                {results.total
                  ? `Showing ${(results.page - 1) * QA_PAGE_SIZE + 1}–${Math.min(
                      results.page * QA_PAGE_SIZE,
                      results.total,
                    )} of ${results.total} questions`
                  : "0 matching questions"}
              </p>
            </div>

            {results.items.length ? (
              <ol className="qa-cards-list qa-list">
                {results.items.map((question) => {
                  const categoryName = categories.find(
                    (category) => category.id === question.categoryId,
                  )?.name;

                  return (
                    <li key={question.id} className="qa-card-item">
                      <article className="qa-question-card">
                        <Link
                          href={questionHref(question.id, returnTo)}
                          className="qa-card-link"
                        >
                          <div
                            className="qa-card-icon-wrap"
                            aria-hidden="true"
                          >
                            <CategoryIcon id={question.categoryId} size={20} />
                          </div>
                          <div className="qa-card-body">
                            {categoryName && (
                              <span className="qa-card-category qa-meta">
                                {categoryName}
                              </span>
                            )}
                            <h3 className="qa-card-title">{question.title}</h3>
                            <p className="qa-card-excerpt">{question.excerpt}</p>
                          </div>
                          <div className="qa-card-meta">
                            <span
                              className={`qa-card-answers qa-answer-count ${
                                question.answerCount
                                  ? "has-answers"
                                  : "no-answers"
                              }`}
                            >
                              <MessageSquare
                                size={14}
                                aria-hidden="true"
                                className="qa-answer-bubble-icon"
                              />
                              <span>
                                {question.answerCount
                                  ? `${question.answerCount} ${
                                      question.answerCount === 1
                                        ? "answer"
                                        : "answers"
                                    }`
                                  : "No published answers yet"}
                              </span>
                            </span>
                            <div
                              className="qa-card-arrow"
                              aria-hidden="true"
                            >
                              <ChevronRight size={18} strokeWidth={2} />
                            </div>
                          </div>
                        </Link>
                      </article>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="result-state">
                <h3>No questions match</h3>
                <p>
                  Try a broader keyword or another category, or explore all
                  published questions.
                </p>
                <Link className="text-link" href="/questions">
                  Browse all questions
                </Link>
              </div>
            )}

            {/* 4. Pagination */}
            {results.pages > 1 && (
              <nav
                className="pagination qa-pagination"
                aria-label="Question pages"
              >
                {results.page > 1 ? (
                  <Link
                    className="pagination-link qa-pagination-btn"
                    href={qaHref({ ...query, page: results.page - 1 })}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                    <span className="sr-only">Previous page</span>
                  </Link>
                ) : (
                  <span
                    className="qa-pagination-btn disabled"
                    aria-disabled="true"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                    <span className="sr-only">Previous page</span>
                  </span>
                )}
                <span className="qa-pagination-info">
                  Page {results.page} of {results.pages}
                </span>
                {results.page < results.pages ? (
                  <Link
                    className="pagination-link qa-pagination-btn"
                    href={qaHref({ ...query, page: results.page + 1 })}
                    aria-label="Next page"
                  >
                    <span className="sr-only">Next page</span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </Link>
                ) : (
                  <span
                    className="qa-pagination-btn disabled"
                    aria-disabled="true"
                    aria-label="Next page"
                  >
                    <span className="sr-only">Next page</span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </span>
                )}
              </nav>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}
