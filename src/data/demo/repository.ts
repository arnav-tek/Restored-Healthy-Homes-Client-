import "server-only";
import type { DirectoryRepository } from "../contracts";
import { categories } from "../../domain/categories";
import {
  listPublicProfessionals,
  findPublicProfile,
} from "../../domain/listing";
import { assertDemoConfiguration } from "../../domain/config";
import { demoProfessionals } from "./fixtures";
import { demoLocationAdapter } from "./locations";
import { searchEligiblePublic } from "../search-service";
const guard = () => assertDemoConfiguration(process.env);
export const demoDirectory: DirectoryRepository = {
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
