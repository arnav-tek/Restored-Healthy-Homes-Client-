import "server-only";
import type { DirectoryRepository } from "../contracts";
import { categories } from "../../domain/categories";
import {
  listPublicProfessionals,
  findPublicProfile,
  isFeaturedEligible,
  toPublicProfessional,
} from "../../domain/listing";
import { assertDemoConfiguration } from "../../domain/config";
import { demoProfessionals } from "./fixtures";
import { demoLocationAdapter } from "./locations";
import { searchEligiblePublic } from "../search-service";
import { demoReviews } from "./review-fixtures";
import { publicReviewsFor } from "../../domain/review";
const guard = () => assertDemoConfiguration(process.env);
export const demoDirectory: DirectoryRepository = {
  async listPublicProfiles() {
    guard();
    if (process.env.RHH_DEMO_SCENARIO === "error") throw new Error("Demo directory failure scenario");
    return listPublicProfessionals(demoProfessionals).flatMap(({ id }) => {
      const profile = findPublicProfile(demoProfessionals, id);
      return profile ? [profile] : [];
    });
  },
  async listFeaturedPublic() {
    guard();
    if (process.env.RHH_DEMO_SCENARIO === "error") return [];
    return demoProfessionals
      .filter(isFeaturedEligible)
      .map(toPublicProfessional);
  },
  async getPublicProfile(id) {
    guard();
    if (process.env.RHH_DEMO_SCENARIO === "error")
      throw new Error("Demo directory failure scenario");
    return findPublicProfile(demoProfessionals, id);
  },
  async search(query) {
    // Eligibility and public-field projection precede every search operation.
    const records = await demoDirectory.listPublic();
    return searchEligiblePublic(
      records,
      categories,
      query,
      demoLocationAdapter,
      records.flatMap(({ id }) => publicReviewsFor(demoReviews, id)),
    );
  },
  async getCategories() {
    guard();
    return categories;
  },
  async listPublic(categoryId) {
    guard();
    if (process.env.RHH_DEMO_SCENARIO === "error")
      throw new Error("Demo directory failure scenario");
    return listPublicProfessionals(demoProfessionals, categoryId);
  },
};
