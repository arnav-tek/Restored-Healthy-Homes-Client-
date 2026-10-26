"use client";
import Link from "next/link";
import { reviewPageSize } from "@/domain/review";
import { publicSessionReviews } from "@/domain/review-session";
import { eligiblePublicIds } from "@/domain/public-session";
import { useDemoSession } from "@/features/member/demo-session";
import { parseReviewPage } from "@/validation/review";
import { ReviewForm } from "./review-form";
import { ReviewList, ReviewSummary } from "./review-content";

export function ReviewsSection({
  professionalId,
  requestedPage,
  returnTo,
}: {
  professionalId: string;
  requestedPage: unknown;
  returnTo: string;
}) {
  const { state } = useDemoSession();
  // Public-only initial state keeps SSR/no-script content consistent with hydration.
  const reviews = publicSessionReviews(
    state.reviews,
    eligiblePublicIds(state),
    professionalId,
  );
  const { page, pages } = parseReviewPage(requestedPage, reviews.length);
  const visible = reviews.slice(
    (page - 1) * reviewPageSize,
    page * reviewPageSize,
  );
  function pageHref(next: number) {
    const query = new URLSearchParams({ reviewPage: String(next), returnTo });
    return `/professionals/${encodeURIComponent(professionalId)}?${query}#reviews`;
  }
  return (
    <section
      className="profile-reviews"
      id="reviews"
      aria-labelledby="reviews-heading"
    >
      <header className="reviews-heading">
        <h2 id="reviews-heading">Reviews</h2>
        <p className="field-help">Fictional sample reviews for this demo.</p>
      </header>
      <ReviewSummary reviews={reviews} />
      <ReviewList reviews={visible} start={(page - 1) * reviewPageSize + 1} />
      {pages > 1 && (
        <nav className="pagination review-pagination" aria-label="Review pages">
          {page > 1 ? (
            <Link className="text-link" href={pageHref(page - 1)}>
              Previous reviews
            </Link>
          ) : (
            <span />
          )}
          <span aria-current="page">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link className="text-link" href={pageHref(page + 1)}>
              Next reviews
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      <ReviewForm professionalId={professionalId} />
    </section>
  );
}
