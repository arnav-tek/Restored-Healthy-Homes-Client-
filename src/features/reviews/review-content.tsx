import { Star } from "lucide-react";
import { summarizeReviews, type PublicReview } from "@/domain/review";

export function ReviewRating({ value }: { value: number }) {
  return (
    <span className="review-rating">
      <span className="review-stars" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <span className="review-star" key={index}>
            <Star size={14} />
            <Star
              size={14}
              fill="currentColor"
              className="review-star-fill"
              style={{
                clipPath: `inset(0 ${100 - Math.max(0, Math.min(1, value - index)) * 100}% 0 0)`,
              }}
            />
          </span>
        ))}
      </span>
      <span>{value} out of 5</span>
    </span>
  );
}
export function ReviewSummary({
  reviews,
}: {
  reviews: readonly PublicReview[];
}) {
  const summary = summarizeReviews(reviews);
  return (
    <div className="review-summary" data-testid="review-summary">
      {summary.average === null ? (
        <p>No reviews yet</p>
      ) : (
        <>
          <p>
            <strong>
              <ReviewRating value={summary.average} />
            </strong>
          </p>
          <p>
            {summary.count} published{" "}
            {summary.count === 1 ? "review" : "reviews"}
          </p>
        </>
      )}
    </div>
  );
}
export function ReviewList({
  reviews,
  start = 1,
}: {
  reviews: readonly PublicReview[];
  start?: number;
}) {
  if (!reviews.length) return null;
  return (
    <ol className="review-list" aria-label="Published reviews" start={start}>
      {reviews.map((review) => (
        <li key={review.id}>
          <article aria-labelledby={`review-${review.id}`}>
            <div className="review-byline">
              <h3 id={`review-${review.id}`}>{review.displayName}</h3>
              <ReviewRating value={review.rating} />
            </div>
            <p className="field-help">
              <time dateTime={review.publishedAt}>
                {review.publishedAt.slice(0, 10)}
              </time>
            </p>
            <p className="review-body">{review.body}</p>
          </article>
        </li>
      ))}
    </ol>
  );
}
