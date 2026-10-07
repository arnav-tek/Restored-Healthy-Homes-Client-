import { ChevronDown, MapPin, FileCheck2, Sprout } from "lucide-react";
import type { PublicProfessional } from "@/domain/professional";
import type { Category } from "@/domain/categories";
import Link from "next/link";
import { profileHref } from "@/validation/profile";
import { ReviewRating } from "@/features/reviews/review-content";
import type { summarizeReviews } from "@/domain/review";

export function ProfessionalCard({
  professional,
  catalog,
  distanceMiles,
  returnTo,
  reviewSummary,
}: {
  professional: PublicProfessional;
  catalog: readonly Category[];
  distanceMiles?: number;
  returnTo?: string;
  reviewSummary?: ReturnType<typeof summarizeReviews>;
}) {
  const initials = professional.businessName
    .split(" ")
    .filter((word) => /^[a-z]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

  const categoryName =
    professional.categoryIds
      .map((id) => catalog.find((category) => category.id === id)?.name)
      .filter(Boolean)
      .join(" · ") || "Specialist";

  return (
    <article className="professional-card" data-testid="professional-card">
      <div className="card-top">
        <span className="category-pill">{categoryName}</span>
        <span className="avatar" aria-hidden="true">
          {initials}
        </span>
      </div>
      <div className="card-body">
        <h3 className="business-name">{professional.businessName}</h3>
        <p className="location">
          <MapPin size={13} aria-hidden="true" />
          <span>
            {professional.city}, {professional.state}
          </span>
        </p>
        {distanceMiles !== undefined ? (
          <p className="distance">
            Approx. {Math.round(distanceMiles)} miles from search city
          </p>
        ) : null}
        <p className="specialty">{professional.specialty}</p>
        <p className="card-summary">{professional.summary}</p>
        {reviewSummary && (
          <div
            className="card-review-summary"
            data-testid="card-review-summary"
          >
            {reviewSummary.average === null ? (
              <p>No published reviews yet</p>
            ) : (
              <>
                <ReviewRating value={reviewSummary.average} />
                <p>
                  {reviewSummary.count} published{" "}
                  {reviewSummary.count === 1 ? "review" : "reviews"}
                </p>
              </>
            )}
          </div>
        )}
        <div className="credential-line">
          {professional.verifiedCredentials.length > 0 ? (
            <>
              <FileCheck2 size={15} aria-hidden="true" />
              <span>Credentials listed</span>
            </>
          ) : (
            <>
              <Sprout size={15} aria-hidden="true" />
              <span>Business information</span>
            </>
          )}
        </div>
      </div>
      <div className="card-footer">
        <details className="services">
          <summary>
            <span>Explore services</span>
            <span className="sr-only"> at {professional.businessName}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <div className="services-dropdown">
            <ul>
              {professional.services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
            <p>Explore the profile for service details and an inquiry form.</p>
          </div>
        </details>
        <Link
          className="text-link profile-card-link"
          href={profileHref(professional.id, returnTo)}
        >
          View profile <span aria-hidden="true">→</span>
          <span className="sr-only">for {professional.businessName}</span>
        </Link>
      </div>
    </article>
  );
}
