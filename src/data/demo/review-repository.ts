import "server-only";
import type { ReviewRepository } from "../contracts";
import { demoDirectory } from "./repository";
import { demoReviews } from "./review-fixtures";
import { publicReviewsFor } from "../../domain/review";
export const demoReviewRepository: ReviewRepository = {
  async publicSnapshot() {
    const professionals = (await demoDirectory.listPublic()).map(
      ({ id, businessName }) => ({ id, businessName }),
    );
    return {
      professionals,
      reviews: professionals.flatMap(({ id }) =>
        publicReviewsFor(demoReviews, id),
      ),
    };
  },
  async listPublic(professionalId) {
    // Reuse the directory's complete eligibility rule before exposing any review.
    if (!(await demoDirectory.getPublicProfile(professionalId))) return null;
    return publicReviewsFor(demoReviews, professionalId);
  },
};
