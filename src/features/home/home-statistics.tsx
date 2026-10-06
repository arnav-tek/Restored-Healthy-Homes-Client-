"use client";
import {
  homeStatistics,
  type PublicListingLocation,
} from "@/domain/home-statistics";
import { useDemoSession } from "@/features/member/demo-session";

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
          <dt>Professionals</dt>
          <dd data-testid="home-professional-count">{stats.professionals}</dd>
        </div>
        <div>
          <dt>States represented</dt>
          <dd data-testid="home-state-count">{stats.states}</dd>
        </div>
        <div>
          <dt>Average review rating</dt>
          <dd>
            <div data-testid="home-rating">
              {stats.average === null ? (
                <span className="stat-empty">No published ratings yet</span>
              ) : (
                <>
                  <span className="stat-number">{stats.average}</span>{" "}
                  <span className="stat-rating-scale">out of 5</span>
                </>
              )}
            </div>
            <p>
              {stats.reviewCount} published fictional{" "}
              {stats.reviewCount === 1 ? "review" : "reviews"}
            </p>
          </dd>
        </div>
      </dl>
      <div className="home-statistics-note">
        <p>
          Fictional demo figures · States reflect listing locations, not service
          coverage.
        </p>
        <details>
          <summary>How these figures work</summary>
          <p>
            Only approved, active, unsuspended listings are counted. The rating
            averages individual published reviews and changes with demo review
            decisions. Refresh restores the samples; these figures are not live
            platform activity.
          </p>
        </details>
      </div>
      {stats.professionals === 0 && (
        <p>No public professionals to show in this demo.</p>
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
