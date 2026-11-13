import Link from "next/link";
import type { PublicReview } from "@/domain/review";
import { reviewPageSize } from "@/domain/review";
import { parseReviewPage } from "@/validation/review";
import { ReviewSummary, ReviewList } from "./review-content";
import { ConnectedReviewForm } from "./connected-review-form";
export function ConnectedReviewsSection({
  professionalId,
  reviews,
  requestedPage,
}: {
  professionalId: string;
  reviews: readonly PublicReview[] | undefined;
  requestedPage?: unknown;
}) {
  if (!reviews)
    return (
      <section id="reviews" className="profile-reviews">
        <h2>Reviews</h2>
        <p role="alert">
          Reviews are temporarily unavailable. Please reload this profile later.
        </p>
      </section>
    );
  const own = reviews.filter((r) => r.professionalId === professionalId),
    { page, pages } = parseReviewPage(requestedPage, own.length);
  return (
    <section
      id="reviews"
      className="profile-reviews"
      aria-labelledby="reviews-heading"
    >
      <header className="reviews-heading">
        <h2 id="reviews-heading">Reviews</h2>
        <p className="field-help">
          Published visitor reviews. Moderation does not imply verified customer
          or purchase status.
        </p>
      </header>
      <ReviewSummary reviews={own} />
      <ReviewList
        reviews={own.slice((page - 1) * reviewPageSize, page * reviewPageSize)}
        start={(page - 1) * reviewPageSize + 1}
      />
      {pages > 1 && (
        <nav className="pagination review-pagination" aria-label="Review pages">
          {page > 1 ? (
            <Link
              href={`/professionals/${professionalId}?reviewPage=${page - 1}#reviews`}
            >
              Previous reviews
            </Link>
          ) : (
            <span />
          )}
          <span aria-current="page">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link
              href={`/professionals/${professionalId}?reviewPage=${page + 1}#reviews`}
            >
              Next reviews
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      <ConnectedReviewForm professionalId={professionalId} />
    </section>
  );
}
