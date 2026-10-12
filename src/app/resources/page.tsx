import type { Metadata } from "next";
import Link from "next/link";
import { resourceRepository } from "@/data/content/resources";
import { resourceCategories } from "@/domain/resource";
import { NewsletterForm } from "@/features/resources/newsletter-form";
export const metadata: Metadata = {
  title: "Resources",
  description:
    "Explore sample editorial layouts for project planning and professional education.",
};
export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const requested = (await searchParams).category;
  const category = typeof requested === "string" ? requested : "";
  const valid =
    !category || resourceCategories.some((item) => item.id === category);
  const articles = (await resourceRepository.list()).filter(
    (article) => !category || article.category === category,
  );
  return (
    <div className="container public-content-page resources-page">
      <header className="public-page-intro">
        <div>
          <p className="public-eyebrow section-tag">Ideas for your next step</p>
          <h1>Resources</h1>
        </div>
        <div className="public-intro-copy">
          <p>
            Explore project planning and professional education. These sample
            articles demonstrate the layout; final editorial content awaits
            approval.
          </p>
        </div>
      </header>
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
        {articles.length} sample{" "}
        {articles.length === 1 ? "article" : "articles"}
      </p>
      {articles.length ? (
        <div className="resource-grid">
          {articles.map((article) => (
            <article key={article.slug} className="resource-card">
              <p className="section-label section-tag">Sample editorial content</p>
              <h2>
                <Link href={`/resources/${article.slug}`}>{article.title}</Link>
              </h2>
              <p>{article.summary}</p>
              <Link className="text-link" href={`/resources/${article.slug}`}>
                Read sample article
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
      <NewsletterForm />
    </div>
  );
}
