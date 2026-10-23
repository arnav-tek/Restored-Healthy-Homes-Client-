"use client";
import Link from "next/link";
import type { ResourceArticle } from "@/domain/resource";
import { resourceCategories } from "@/domain/resource";
import {
  publishedSessionArticles,
  isSessionArticleId,
} from "@/domain/admin-showcase";
import { useDemoSession } from "@/features/member/demo-session";

export function ResourceListing({
  seed,
  category,
  valid,
}: {
  seed: readonly ResourceArticle[];
  category: string;
  valid: boolean;
}) {
  const { state } = useDemoSession();
  const published = publishedSessionArticles(state.articles)
    .filter((item) => !category || item.category === category)
    .map((item) => ({
      slug: item.id,
      title: item.title,
      summary: item.summary,
    }));
  const samples = seed.filter(
    (item) => !category || item.category === category,
  );
  const articles = [...samples, ...published];
  return (
    <>
      <nav className="resource-filters" aria-label="Resource categories">
        <Link href="/resources" aria-current={!category ? "page" : undefined}>
          All resources
        </Link>
        {resourceCategories.map((item) => (
          <Link
            key={item.id}
            href={`/resources?category=${item.id}`}
            aria-current={item.id === category ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <p role="status">
        {samples.length} sample {samples.length === 1 ? "article" : "articles"}
        {published.length > 0 && ` · ${published.length} published in this tab`}
      </p>
      {articles.length ? (
        <div className="resource-grid" data-scroll-stagger>
          {articles.map((article) => (
            <article key={article.slug} className="resource-card" data-scroll-reveal>
              <p className="section-label section-tag">
                {isSessionArticleId(article.slug)
                  ? "Published in this tab"
                  : "Sample editorial content"}
              </p>
              <h2>
                <Link href={`/resources/${article.slug}`}>{article.title}</Link>
              </h2>
              <p>{article.summary}</p>
              <Link className="text-link" href={`/resources/${article.slug}`}>
                {isSessionArticleId(article.slug)
                  ? "Read article"
                  : "Read sample article"}
                <span className="sr-only">: {article.title}</span>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <h2>
            {valid ? "Stories are still to come" : "Category unavailable"}
          </h2>
          <p>
            {valid
              ? "There are no sample articles in this category yet."
              : "Choose one of the resource categories above."}
          </p>
          <Link className="text-link" href="/resources">
            View all resources
          </Link>
        </section>
      )}
    </>
  );
}
