"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { moderationReviews } from "@/domain/review-session";
import { useDemoSession } from "@/features/member/demo-session";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
import { ReviewModerationForm } from "./review-moderation-form";
import { ReviewRating } from "./review-content";

export function AdminReviews() {
  const { state } = useDemoSession();
  const { query, href, navigate, pending } = useDashboardNavigation("admin");
  const ready = useDemoReady();
  const professionals = state.reviews.snapshot.professionals;
  const reviews = moderationReviews(state.reviews);
  const selected = reviews.find((review) => review.id === query.review);
  const matching = reviews.filter(
    (review) =>
      (query.reviewStatus === "all" || review.status === query.reviewStatus) &&
      (!query.professional || review.professionalId === query.professional),
  );
  const professionalName = (id: string) =>
    professionals.find((item) => item.id === id)?.businessName ??
    "Professional unavailable";
  const available =
    selected && state.publicProfessionalIds.includes(selected.professionalId);
  return (
    <div className="reviews-workspace">
      <p className="field-help">
        Review feedback and manage publication. Only eligible professional profiles display published reviews.
      </p>
      {query.review ? (
        <>
          <Link className="text-link" href={href({ review: "" })}>
            ← Back to reviews queue
          </Link>
          {!selected ? (
            <p className="workspace-empty">
              This review is unavailable. Reset or refresh clears session
              submissions. Return to the queue to choose a current review.
            </p>
          ) : (
            <>
              <article className="review-detail" aria-label="Review detail">
                <h2>{professionalName(selected.professionalId)}</h2>
                <p className="field-help">
                  {selected.source === "seed"
                    ? "Published seed example"
                    : "Visitor submission"}{" "}
                  · Reference: {selected.id}
                </p>
                <p>
                  Review status:{" "}
                  <strong data-testid="moderation-review-status">
                    {selected.status}
                  </strong>
                </p>
                <h3>{selected.displayName}</h3>
                <ReviewRating value={selected.rating} />
                <p className="review-body">{selected.body}</p>
                {available && (
                  <Link
                    className="text-link"
                    href={`/professionals/${selected.professionalId}#reviews`}
                  >
                    View Public reviews
                  </Link>
                )}
              </article>
              {available ? (
                <ReviewModerationForm key={selected.id} review={selected} />
              ) : (
                <p className="workspace-empty">
                  This professional is unavailable in the public-directory
                  snapshot. Review decisions are disabled.
                </p>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <form
            key={`${query.reviewStatus}-${query.professional}`}
            onSubmit={(event) => {
              event.preventDefault();
              if (!ready || pending) return;
              const data = new FormData(event.currentTarget);
              navigate({
                review: "",
                reviewStatus: String(data.get("reviewStatus") ?? "all"),
                professional: String(data.get("professional") ?? ""),
              });
            }}
          >
            <fieldset className="review-filters" disabled={!ready || pending}>
              <legend className="sr-only">Filter reviews</legend>
              <div className="search-field">
                <label htmlFor="review-status-filter">Review status</label>
                <select
                  id="review-status-filter"
                  name="reviewStatus"
                  defaultValue={query.reviewStatus}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="published">Published</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="search-field">
                <label htmlFor="review-professional-filter">Professional</label>
                <select
                  id="review-professional-filter"
                  name="professional"
                  defaultValue={query.professional}
                >
                  <option value="">All professionals</option>
                  {query.professional &&
                    !professionals.some(
                      (item) => item.id === query.professional,
                    ) && (
                      <option value={query.professional}>
                        Unavailable professional
                      </option>
                    )}
                  {professionals.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.businessName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-actions">
                <Button type="submit">Filter reviews</Button>
                <Button
                  type="button"
                  className="button-secondary"
                  onClick={() =>
                    navigate({
                      reviewStatus: "all",
                      professional: "",
                      review: "",
                    })
                  }
                >
                  Clear review filters
                </Button>
              </div>
            </fieldset>
          </form>
          <p role="status">
            {matching.length} matching{" "}
            {matching.length === 1 ? "review" : "reviews"}
          </p>
          <ol className="review-queue">
            {matching.map((review) => (
              <li key={review.id}>
                <article>
                  <div className="review-byline">
                    <h2>{professionalName(review.professionalId)}</h2>
                    <ReviewRating value={review.rating} />
                  </div>
                  <h3>
                    <Link href={href({ review: review.id })}>
                      Review by {review.displayName}
                    </Link>
                  </h3>
                  <p className="field-help">
                    {review.status} ·{" "}
                    {review.source === "seed"
                      ? "Seed example"
                      : "Visitor submission"}
                  </p>
                  <p className="review-body">
                    {review.body.slice(0, 160)}
                    {review.body.length > 160 ? "…" : ""}
                  </p>
                </article>
              </li>
            ))}
          </ol>
          {!matching.length && (
            <p className="workspace-empty">
              No reviews match. Clear filters or submit a review on a public profile to try moderation.
            </p>
          )}
        </>
      )}
    </div>
  );
}
