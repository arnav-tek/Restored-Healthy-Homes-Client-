"use client";
import {
  homeStatistics,
  type PublicListingLocation,
} from "@/domain/home-statistics";
import { useDemoSession } from "@/features/member/demo-session";
import { ReviewStars } from "@/features/reviews/review-content";

export function HomeStatistics({
  listings,
}: {
  listings: readonly PublicListingLocation[] | null;
}) {
  const { state } = useDemoSession();
  if (listings === null)
    return (
      <section className="home-statistics" aria-label="Directory statistics">
        <p>
          Directory statistics are unavailable. Reload to try again; you can
          still search or browse the directory.
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
      className="home-statistics"
      aria-label="Directory statistics"
      data-testid="home-statistics"
    >
      <div className="home-stats-card">
        <dl className="home-statistic-values">
          <div className="home-stat-item">
            <dt className="home-stat-label">Professionals</dt>
            <dd data-testid="home-professional-count" className="home-stat-number">
              {stats.professionals}
            </dd>
          </div>
          <div className="home-stat-item">
            <dt className="home-stat-label">States represented</dt>
            <dd data-testid="home-state-count" className="home-stat-number">
              {stats.states}
            </dd>
          </div>
          <div className="home-stat-item">
            <dt className="home-stat-label">Average review rating</dt>
            <dd className="home-stat-rating-dd">
              <div data-testid="home-rating" className="home-stat-rating-group">
                {stats.average === null ? (
                  <span className="stat-empty">No published ratings yet</span>
                ) : (
                  <>
                    <span className="home-stat-number">{stats.average}</span>{" "}
                    <span className="sr-only">out of 5</span>
                  </>
                )}
                {stats.average !== null && <ReviewStars value={stats.average} />}
              </div>
              <span className="sr-only">
                {stats.reviewCount} published{" "}
                {stats.reviewCount === 1 ? "review" : "reviews"}
              </span>
            </dd>
          </div>
        </dl>
      </div>
      <div className="home-statistics-note">
        <details>
          <summary>How these figures work</summary>
          <p>
            Only approved, active, unsuspended listings are counted. The rating
            averages individual published reviews. Figures reflect the listings
            and reviews currently shown. States reflect listing locations, not
            service coverage.
          </p>
          {stats.missingStates > 0 && (
            <p className="field-help">
              {stats.missingStates}{" "}
              {stats.missingStates === 1 ? "listing has" : "listings have"} no
              state recorded and {stats.missingStates === 1 ? "is" : "are"}{" "}
              excluded from the state count.
            </p>
          )}
        </details>
      </div>
      {stats.professionals === 0 && (
        <p className="home-stats-empty-notice">
          No public professionals to show right now.
        </p>
      )}
    </section>
  );
}
