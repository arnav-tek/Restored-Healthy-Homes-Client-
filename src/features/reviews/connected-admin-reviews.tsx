import Link from "next/link";
import type {
  AdminReviewsWorkspace,
  ReviewFilters,
} from "@/domain/connected-reviews";
import { Button } from "@/components/ui/button";
import { ReviewRating } from "./review-content";
import { ConnectedReviewModeration } from "./connected-review-moderation";
import { inquiryDate } from "@/features/member/inquiry-date";
export function reviewAdminHref(
  filters: ReviewFilters,
  change: Partial<ReviewFilters> = {},
) {
  const f = { ...filters, ...change },
    p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== null) p.set(k, String(v));
  return `/admin/reviews?${p}`;
}
export function ConnectedAdminReviews({
  data,
  filters,
}: {
  data: AdminReviewsWorkspace;
  filters: ReviewFilters;
}) {
  const r = data.detail,
    name = (pid: string) =>
      data.professionals.find((p) => p.id === pid)?.businessName ??
      "Unavailable listing";
  return (
    <div className="reviews-workspace min-w-0 [overflow-wrap:anywhere]">
      {r ? (
        <div className="review-detail-container grid gap-6">
          <Link href={reviewAdminHref(filters, { id: null })}>
            ← Back to reviews queue
          </Link>
          <article className="panel admin-detail-card review-detail">
            <h2>{name(r.professionalId)}</h2>
            <p>
              Review: {r.status} · Version {r.version}
            </p>
            <h3>{r.displayName}</h3>
            <ReviewRating value={r.rating} />
            <p className="review-body">{r.body}</p>
            <p className="field-help">
              {r.eligible
                ? "Public listing is eligible."
                : "Listing is not publicly eligible."}{" "}
              No verified-customer claim is made.
            </p>
            {r.eligible && (
              <Link
                href={`/professionals/${r.professionalId}#reviews`}
                target="_blank"
                rel="noopener"
              >
                Open current public reviews (new tab)
              </Link>
            )}
          </article>
          <ConnectedReviewModeration
            key={r.id}
            review={r}
            compareHref={reviewAdminHref(filters)}
          />
          <section className="panel">
            <h3>Private decision history</h3>
            {r.history.length ? (
              <ol className="grid gap-4">
                {r.history.map((h) => (
                  <li key={h.version}>
                    <strong>
                      {h.action} · Version {h.version}: {h.previousStatus} →{" "}
                      {h.nextStatus}
                    </strong>
                    <p>
                      {inquiryDate(h.at)} · Actor {h.actorId}
                    </p>
                    <p>Reason: {h.reason}</p>
                    {h.note && <p>Private note: {h.note}</p>}
                    <details>
                      <summary>Review as assessed</summary>
                      <p>{h.displayName}</p>
                      <ReviewRating value={h.rating} />
                      <p className="review-body">{h.body}</p>
                    </details>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No saved decisions yet.</p>
            )}
          </section>
        </div>
      ) : (
        <>
          <div className="admin-filter-card">
            <form method="get" action="/admin/reviews">
              <fieldset className="qa-filters grid gap-4">
                <legend className="sr-only">Filter reviews</legend>
                <div className="search-field">
                  <label htmlFor="review-status">Publication status</label>
                  <select
                    id="review-status"
                    name="status"
                    defaultValue={filters.status}
                  >
                    {["all", "pending", "published", "hidden", "rejected"].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s === "all" ? "All statuses" : s}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="search-field">
                  <label htmlFor="review-professional">Professional</label>
                  <select
                    id="review-professional"
                    name="professional"
                    defaultValue={filters.professional ?? ""}
                  >
                    <option value="">All professionals</option>
                    {data.professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.businessName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-actions">
                  <Button type="submit">Filter reviews</Button>
                  <Link
                    href="/admin/reviews?status=all"
                    className="button button-secondary"
                  >
                    Clear review filters
                  </Link>
                </div>
              </fieldset>
            </form>
          </div>
          <p role="status">{data.total} matching reviews</p>
          <ol className="qa-cards-list">
            {data.items.map((i) => (
              <li key={i.id}>
                <article className="qa-record-card">
                  <p>
                    {i.status} · {name(i.professionalId)}
                  </p>
                  <h2>
                    <Link href={reviewAdminHref(filters, { id: i.id })}>
                      {i.displayName}
                    </Link>
                  </h2>
                  <ReviewRating value={i.rating} />
                  <p className="review-body">
                    {i.body.slice(0, 180)}
                    {i.body.length > 180 ? "…" : ""}
                  </p>
                  <Link href={reviewAdminHref(filters, { id: i.id })}>
                    Moderate review →
                  </Link>
                </article>
              </li>
            ))}
          </ol>
          {!data.items.length && (
            <div className="workspace-empty">
              <h2>No reviews match</h2>
              <p>Change filters or return after a review is submitted.</p>
            </div>
          )}
          <nav className="admin-inline-actions" aria-label="Review queue pages">
            {data.page > 1 && (
              <Link href={reviewAdminHref(filters, { page: data.page - 1 })}>
                Previous page
              </Link>
            )}
            <span>Page {data.page}</span>
            {data.hasNext && (
              <Link href={reviewAdminHref(filters, { page: data.page + 1 })}>
                Next page
              </Link>
            )}
          </nav>
        </>
      )}
      <p className="field-help">
        Only published reviews for approved, active, unsuspended listings affect
        public ratings. Notification events are not email delivery.
      </p>
    </div>
  );
}
