"use client";
import { eligiblePublicIds, publicSessionProfiles } from "@/domain/public-session";
import Link from "next/link";
import { CheckCircle2, Clock, ArrowRight, ShieldAlert } from "lucide-react";
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
  const professionals = [...new Map([
    ...state.reviews.snapshot.professionals,
    ...publicSessionProfiles(state).map(({ id, businessName }) => ({ id, businessName })),
  ].map((item) => [item.id, item])).values()];
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
    selected && eligiblePublicIds(state).includes(selected.professionalId);

  const pendingReviewsCount = reviews.filter((r) => r.status === "pending").length;
  const publishedReviewsCount = reviews.filter((r) => r.status === "published").length;
  const rejectedReviewsCount = reviews.filter((r) => r.status === "rejected").length;

  return (
    <div className="reviews-workspace">
      {query.review ? (
        <div className="review-detail-container">
          <Link className="text-link workspace-back-link" href={href({ review: "" })}>
            <span aria-hidden="true">← </span>Back to reviews queue
          </Link>
          {!selected ? (
            <div className="workspace-empty">
              <h2>This review is unavailable</h2>
              <p>
                Reset or refresh clears session submissions. Return to the queue to choose a current review.
              </p>
            </div>
          ) : (
            <>
              <article className="panel admin-detail-card review-detail" aria-label="Review detail">
                <div className="review-detail-header">
                  <h2 className="admin-detail-heading">{professionalName(selected.professionalId)}</h2>
                  <span
                    className={`admin-status-badge badge-${
                      selected.status === "published"
                        ? "approved"
                        : selected.status === "pending"
                          ? "pending"
                          : "rejected"
                    }`}
                  >
                    {selected.status}
                  </span>
                </div>

                <p className="field-help">
                  {selected.source === "seed"
                    ? "Published seed example"
                    : "Visitor submission"}{" "}
                  · Reference: {selected.id}
                </p>

                <p className="review-status-row">
                  Review status:{" "}
                  <strong data-testid="moderation-review-status">
                    {selected.status}
                  </strong>
                </p>

                <div className="review-author-rating">
                  <h3 className="review-display-name">{selected.displayName}</h3>
                  <ReviewRating value={selected.rating} />
                </div>

                <div className="review-body-box">
                  <p className="review-body">{selected.body}</p>
                </div>

                {available && (
                  <div className="public-link-wrap">
                    <Link
                      className="text-link"
                      href={`/professionals/${selected.professionalId}#reviews`}
                    >
                      View Public reviews <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                )}
              </article>

              {available ? (
                <ReviewModerationForm key={selected.id} review={selected} />
              ) : (
                <div className="workspace-empty">
                  <h2>Professional unavailable</h2>
                  <p>
                    This professional is unavailable in the public-directory
                    snapshot. Review decisions are disabled.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="tab-summary-grid">
            <div className="tab-summary-card">
              <div className="tab-summary-icon icon-peach">
                <Clock size={18} aria-hidden="true" />
              </div>
              <div className="tab-summary-details">
                <span className="tab-summary-num">{pendingReviewsCount}</span>
                <strong className="tab-summary-label">Pending reviews</strong>
                <small className="tab-summary-sub">Awaiting moderation</small>
              </div>
            </div>

            <div className="tab-summary-card">
              <div className="tab-summary-icon icon-sage">
                <CheckCircle2 size={18} aria-hidden="true" />
              </div>
              <div className="tab-summary-details">
                <span className="tab-summary-num">{publishedReviewsCount}</span>
                <strong className="tab-summary-label">Published reviews</strong>
                <small className="tab-summary-sub">Visible on public profiles</small>
              </div>
            </div>

            <div className="tab-summary-card">
              <div className="tab-summary-icon icon-neutral">
                <ShieldAlert size={18} aria-hidden="true" />
              </div>
              <div className="tab-summary-details">
                <span className="tab-summary-num">{rejectedReviewsCount}</span>
                <strong className="tab-summary-label">Rejected reviews</strong>
                <small className="tab-summary-sub">Excluded from directory</small>
              </div>
            </div>
          </div>

          {/* Filter Toolbar Card */}
          <div className="admin-filter-card">
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
              <fieldset className="admin-filters-grid" disabled={!ready || pending}>
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
                <div className="filter-actions-row">
                  <Button type="submit" className="button-primary">
                    Filter reviews
                  </Button>
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
          </div>

          <p role="status" className="result-count">
            {matching.length} matching{" "}
            {matching.length === 1 ? "review" : "reviews"}
          </p>

          <ol className="review-queue review-queue-list">
            {matching.map((review) => (
              <li key={review.id}>
                <article className="review-queue-card">
                  <div className="review-card-header">
                    <div className="review-byline">
                      <h2 className="review-pro-title">{professionalName(review.professionalId)}</h2>
                      <ReviewRating value={review.rating} />
                    </div>
                    <span
                      className={`admin-status-badge badge-${
                        review.status === "published"
                          ? "approved"
                          : review.status === "pending"
                            ? "pending"
                            : "rejected"
                      }`}
                    >
                      {review.status}
                    </span>
                  </div>

                  <h3 className="review-display-heading">
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

                  <p className="review-preview-text">
                    {review.body.slice(0, 160)}
                    {review.body.length > 160 ? "…" : ""}
                  </p>

                  <div className="review-card-footer">
                    <Link
                      href={href({ review: review.id })}
                      className="table-action-link"
                    >
                      Moderate review <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ol>

          {!matching.length && (
            <div className="workspace-empty">
              <h2>No reviews match</h2>
              <p>
                Clear filters or submit a review on a public profile to try moderation.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
