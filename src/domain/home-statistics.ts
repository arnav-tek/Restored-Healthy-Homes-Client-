import type { PublicProfessional } from "./professional";
import { summarizeReviews } from "./review";
import { publicSessionReviews, type ReviewSession } from "./review-session";

export type PublicListingLocation = Readonly<
  Pick<PublicProfessional, "id" | "state">
>;

// Callers supply the directory repository's already eligible public projection.
// Intersect with the existing review snapshot; member-demo decisions are separate.
export function homeStatistics(
  listings: readonly PublicListingLocation[],
  reviews: ReviewSession,
  eligibleIds: readonly string[],
) {
  const eligible = new Set(eligibleIds);
  const publicListings = Array.from(
    new Map(
      listings
        .filter(({ id }) => eligible.has(id))
        .map((listing) => [listing.id, listing]),
    ).values(),
  );
  const states = new Set(
    publicListings
      .map(({ state }) => state.trim().toUpperCase())
      .filter(Boolean),
  );
  const summary = summarizeReviews(
    publicListings.flatMap(({ id }) =>
      publicSessionReviews(reviews, eligibleIds, id),
    ),
  );
  return {
    professionals: publicListings.length,
    states: states.size,
    missingStates: publicListings.filter(({ state }) => !state.trim()).length,
    reviewCount: summary.count,
    average: summary.average,
  };
}
