"use client";
import {
  homeStatistics,
  type PublicListingLocation,
} from "@/domain/home-statistics";
import { useDemoSession } from "@/features/member/demo-session";
import { ReviewRating } from "@/features/reviews/review-content";

export function HomeStatistics({
  listings,
}: {
  listings: readonly PublicListingLocation[] | null;
}) {
  const { state } = useDemoSession();
  if (listings === null)
    return (
      <section
        className="home-statistics container"
        aria-labelledby="statistics-heading"
      >
        <h2 id="statistics-heading">A look at the demo directory</h2>
        <p>
          Demo statistics are unavailable. Reload to try again; you can still
          explore the categories above.
        </p>
      </section>
    );
  const stats = homeStatistics(
    listings,
    state.reviews,
    state.publicProfessionalIds,
  );
  return (
    <section
      className="home-statistics container"
      aria-labelledby="statistics-heading"
      data-testid="home-statistics"
    >
      <h2 id="statistics-heading">A look at the demo directory</h2>
      <dl className="home-statistic-values">
        <div>
          <dt>Eligible public professionals</dt>
          <dd data-testid="home-professional-count">{stats.professionals}</dd>
        </div>
        <div>
          <dt>States represented by listing locations</dt>
          <dd data-testid="home-state-count">{stats.states}</dd>
        </div>
        <div>
          <dt>Average published-review rating</dt>
          <dd>
            <div data-testid="home-rating">
              {stats.average === null ? (
                <span className="stat-empty">No published ratings yet</span>
              ) : (
                <ReviewRating value={stats.average} />
              )}
            </div>
            <p>
              {stats.reviewCount} published fictional{" "}
              {stats.reviewCount === 1 ? "review" : "reviews"}
            </p>
          </dd>
        </div>
      </dl>
      <p className="field-help">
        Fictional demo figures, not live platform activity. States describe
        listing locations, not verified service coverage. Ratings reflect
        published reviews in this tab; refresh restores the samples.
      </p>
      {stats.professionals === 0 && (
        <p>No eligible public professionals in this demo snapshot.</p>
      )}
      {stats.missingStates > 0 && (
        <p className="field-help">
          {stats.missingStates}{" "}
          {stats.missingStates === 1 ? "listing has" : "listings have"} no state
          recorded and {stats.missingStates === 1 ? "is" : "are"} excluded from
          the state count.
        </p>
      )}
    </section>
  );
}
