import type { Metadata } from "next";
import { ResourceListing } from "@/features/resources/resource-listing";
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
      <ResourceListing seed={articles} category={category} valid={valid} />
      <NewsletterForm />
    </div>
  );
}
