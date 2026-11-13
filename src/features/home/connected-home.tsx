import { summarizeReviews, type PublicReview } from "@/domain/review";
import { ReviewStars } from "@/features/reviews/review-content";
import type { Category } from "@/domain/categories";
import type { PublicListingLocation } from "@/domain/home-statistics";
export function ConnectedHomeSearch({
  catalog,
  unavailable,
}: {
  catalog: readonly Category[];
  unavailable: boolean;
}) {
  return (
    <div className="hero-search">
      <h2 className="sr-only">Find professionals</h2>
      <form
        action="/directory"
        method="get"
        className="search-form"
        aria-label="Find professionals"
      >
        <div className="search-field">
          <label htmlFor="home-state">State abbreviation</label>
          <input
            id="home-state"
            name="state"
            maxLength={2}
            placeholder="e.g. NC"
            aria-describedby="home-search-help"
          />
        </div>
        <div className="search-field">
          <label htmlFor="home-category">Professional category</label>
          <select id="home-category" name="category">
            <option value="">All professionals</option>
            {catalog.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button className="button" type="submit">
          Search
        </button>
      </form>
      <p id="home-search-help" className="field-help">
        Search by state or specialty. City, ZIP and radius search are not
        available yet.
      </p>
      {unavailable && (
        <p role="alert">
          The directory is temporarily unavailable. Please try again later.
        </p>
      )}
    </div>
  );
}
export function ConnectedHomeStatistics({
  listings,
  reviews,
}: {
  listings: readonly PublicListingLocation[] | null;
  reviews?: readonly PublicReview[];
}) {
  if (listings === null)
    return (
      <section className="home-statistics" aria-label="Directory statistics">
        <p>Directory statistics are temporarily unavailable.</p>
      </section>
    );
  const unique = [...new Map(listings.map((p) => [p.id, p])).values()];
  const states = new Set(
    unique.map((p) => p.state.trim().toUpperCase()).filter(Boolean),
  );
  const summary =
    reviews === undefined
      ? null
      : summarizeReviews(
          reviews.filter((r) => unique.some((p) => p.id === r.professionalId)),
        );
  return (
    <section
      className="home-statistics"
      aria-label="Directory statistics"
      data-testid="home-statistics"
    >
      <div className="home-stats-card">
        <dl className="home-statistic-values">
          <div className="home-stat-item">
            <dt className="home-stat-label">Professionals</dt>
            <dd
              className="home-stat-number"
              data-testid="home-professional-count"
            >
              {unique.length}
            </dd>
          </div>
          <div className="home-stat-item">
            <dt className="home-stat-label">States represented</dt>
            <dd className="home-stat-number" data-testid="home-state-count">
              {states.size}
            </dd>
          </div>
          {summary && (
            <div className="home-stat-item">
              <dt className="home-stat-label">Average review rating</dt>
              <dd className="home-stat-rating-dd">
                <div
                  data-testid="home-rating"
                  className="home-stat-rating-group"
                >
                  {summary.average === null ? (
                    <span className="stat-empty">No published ratings yet</span>
                  ) : (
                    <>
                      <span className="home-stat-number">
                        {summary.average}
                      </span>
                      <span className="sr-only">out of 5</span>
                      <ReviewStars value={summary.average} />
                    </>
                  )}
                </div>
              </dd>
            </div>
          )}
        </dl>
        {summary && (
          <p className="home-stat-review-count">
            Rating based on {summary.count} published{" "}
            {summary.count === 1 ? "review" : "reviews"}
          </p>
        )}
      </div>
      <div className="home-statistics-note">
        <details>
          <summary>How these figures work</summary>
          <p>
            Counts use the same approved, active, unsuspended public listings
            shown in the directory. States represent listing locations, not
            service coverage. Average rating uses all published review scores
            across these listings, rounded to one decimal. Each published review
            contributes one score. Pending, hidden and rejected reviews are
            excluded.
          </p>
        </details>
      </div>
      {!unique.length && (
        <p className="home-stats-empty-notice">
          No public professionals are published yet.
        </p>
      )}
    </section>
  );
}
