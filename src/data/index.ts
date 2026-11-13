import { connectedQa } from "./supabase/qa";
import "server-only";
import { connectedDirectory } from "./supabase/public-directory";
import { applicationMode } from "../domain/config";
import { demoDirectory } from "./demo/repository";
import { demoLocationAdapter } from "./demo/locations";
import { demoQaRepository } from "./demo/qa-repository";
import { demoReviewRepository } from "./demo/review-repository";
import type {
  DirectoryRepository,
  LocationAdapter,
  QaRepository,
  ReviewRepository,
} from "./contracts";

async function unavailable(): Promise<never> {
  throw new Error("This connected data workflow is not implemented yet.");
}
const demo = applicationMode(process.env) === "demo";
export const directoryRepository: DirectoryRepository = demo
  ? demoDirectory
  : connectedDirectory;
export const locationAdapter: LocationAdapter = demo
  ? demoLocationAdapter
  : {
      listSupported: unavailable,
      resolve: unavailable,
    };
export const qaRepository: QaRepository = demo ? demoQaRepository : connectedQa;
export const reviewRepository: ReviewRepository = demo
  ? demoReviewRepository
  : {
      listPublic: unavailable,
      publicSnapshot: unavailable,
    };
