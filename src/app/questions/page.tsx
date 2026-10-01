import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { qaRepository } from "@/data";
import { categories } from "@/domain/categories";
import { QA_PAGE_SIZE, type QaResults } from "@/domain/qa";
import { parseQaQuery, qaHref, questionHref } from "@/validation/qa";
import type { RawSearchParams } from "@/validation/directory";
import { SearchForm } from "@/features/directory/search-form";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = {
  title: "Ask a Specialist | Demo Q&A",
  description:
    "Browse fictional healthy-home service questions and sample answers.",
  robots: { index: false, follow: false },
};
export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const { query, errors } = parseQaQuery(params);
  let results: QaResults | undefined;
  let unavailable = false;
  if (!Object.keys(errors).length) {
    try {
      results = await qaRepository.search(query);
    } catch {
      unavailable = true;
    }
  }
  if (results) {
    const raw = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) value.forEach((item) => raw.append(key, item));
      else if (value !== undefined) raw.set(key, value);
    }
    const canonical = qaHref({ ...query, page: results.page });
    if (`/questions${raw.size ? `?${raw}` : ""}` !== canonical)
      redirect(canonical);
  }
  const returnTo = qaHref({ ...query, page: results?.page ?? 1 });
  return (
    <div className="container qa-page">
      <header className="page-heading qa-heading">
        <div>
          <h1>Ask a Specialist</h1>
          <p>
            Explore questions about healthy-home services and planning your next
            project.
          </p>
        </div>
        <Link
          className="button"
          href={`/questions/ask?${new URLSearchParams({ returnTo })}`}
        >
          Ask a demo question
        </Link>
      </header>
      <Notice>
        <strong>Fictional Q&A.</strong> All questions, answers and professional
        attributions are sample content, not advice or endorsements. No messages
        are delivered.
      </Notice>
      <SearchForm
        key={returnTo + JSON.stringify(errors)}
        action="/questions"
        label="Search questions"
        className="qa-filters"
      >
        <div className="search-field">
          <label htmlFor="qa-q">Keyword</label>
          <input
            id="qa-q"
            name="q"
            defaultValue={query.q}
            maxLength={120}
            placeholder="Search question titles and text"
            aria-invalid={!!errors.q}
            aria-describedby={errors.q ? "qa-q-error" : undefined}
          />
          {errors.q && (
            <p id="qa-q-error" className="field-error">
              {errors.q}
            </p>
          )}
        </div>
        <div className="search-field">
          <label htmlFor="qa-category">Category</label>
          <select
            id="qa-category"
            name="category"
            defaultValue={query.category}
            aria-invalid={!!errors.category}
            aria-describedby={errors.category ? "qa-category-error" : undefined}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category && (
            <p id="qa-category-error" className="field-error">
              {errors.category}
            </p>
          )}
        </div>
        <div className="filter-actions">
          <Button type="submit">Search questions</Button>
          <Link className="text-link" href="/questions">
            Clear filters
          </Link>
        </div>
      </SearchForm>
      <section aria-label="Question results">
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
            <p>
              The demo questions could not be loaded. Try this search again.
            </p>
            <Link className="button" href={returnTo}>
              Retry question search
            </Link>
          </div>
        ) : results ? (
          <>
            <div className="results-heading">
              <h2>Published sample questions</h2>
              <p aria-live="polite">
                {results.total
                  ? `Showing ${(results.page - 1) * QA_PAGE_SIZE + 1}–${Math.min(results.page * QA_PAGE_SIZE, results.total)} of ${results.total} fictional questions`
                  : "0 matching fictional questions"}
              </p>
            </div>
            {results.items.length ? (
              <ol className="qa-list">
                {results.items.map((question) => (
                  <li key={question.id}>
                    <article>
                      <p className="qa-meta">
                        {
                          categories.find(
                            (category) => category.id === question.categoryId,
                          )?.name
                        }
                      </p>
                      <h3>
                        <Link href={questionHref(question.id, returnTo)}>
                          {question.title}
                        </Link>
                      </h3>
                      <p>{question.excerpt}</p>
                      <span className="qa-answer-count">
                        {question.answerCount
                          ? `${question.answerCount} sample ${question.answerCount === 1 ? "answer" : "answers"}`
                          : "No published answers yet"}
                      </span>
                    </article>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="result-state">
                <h3>No questions match</h3>
                <p>
                  Try a broader keyword or another category, or explore all
                  published examples.
                </p>
                <Link className="text-link" href="/questions">
                  Browse all questions
                </Link>
              </div>
            )}
            {results.pages > 1 && (
              <nav className="pagination" aria-label="Question pages">
                {results.page > 1 ? (
                  <Link
                    className="pagination-link"
                    href={qaHref({ ...query, page: results.page - 1 })}
                  >
                    Previous page
                  </Link>
                ) : (
                  <span />
                )}
                <span>
                  Page {results.page} of {results.pages}
                </span>
                {results.page < results.pages ? (
                  <Link
                    className="pagination-link"
                    href={qaHref({ ...query, page: results.page + 1 })}
                  >
                    Next page
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}
