import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resourceRepository } from "@/data/content/resources";
import { resourceCategories } from "@/domain/resource";
import { isSessionArticleId } from "@/domain/admin-showcase";
import { SessionResource } from "@/features/resources/session-resource";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  if (isSessionArticleId(slug)) return { title: "Resource", robots: { index: false, follow: false } };
  const article = await resourceRepository.get(slug);
  return {
    title: article?.title ?? "Resource unavailable",
    description: article?.summary,
  };
}
export default async function ResourcePage({ params }: Props) {
  const slug = (await params).slug;
  if (isSessionArticleId(slug)) return <SessionResource id={slug} />;
  const article = await resourceRepository.get(slug);
  if (!article) notFound();
  return (
    <div className="container public-content-page resource-article">
      <Link
        className="text-link"
        href={`/resources?category=${article.category}`}
      >
        Back to{" "}
        {resourceCategories.find((item) => item.id === article.category)?.label}
      </Link>
      <article>
        <header data-scroll-reveal>
          <p className="section-label section-tag">
            Sample editorial content · awaiting approval
          </p>
          <h1>{article.title}</h1>
          <p className="resource-lead">{article.summary}</p>
        </header>
        {article.sections.map((section) => (
          <section key={section.heading} data-scroll-reveal>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>
      <aside className="panel" data-scroll-reveal>
        <h2>Explore further</h2>
        <p>
          <Link
            className="text-link"
            href={
              article.category === "professionals" ? "/education" : "/directory"
            }
          >
            {article.category === "professionals"
              ? "Explore education pathways"
              : "Find Specialists"}
          </Link>
        </p>
      </aside>
    </div>
  );
}
