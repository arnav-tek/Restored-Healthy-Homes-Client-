import type { Category } from "../domain/categories";
import type { PublicProfessional } from "../domain/professional";
import type { LocationAdapter } from "./contracts";
import type { SearchQuery, SearchResponse } from "../domain/directory-search";
import { searchPublicDirectory } from "../domain/directory-search";
import type { PublicReview } from "../domain/review";
export async function searchEligiblePublic(
  professionals: readonly PublicProfessional[],
  catalog: readonly Category[],
  query: SearchQuery,
  adapter: LocationAdapter,
  reviews: readonly PublicReview[] = [],
): Promise<SearchResponse> {
  if (
    (query.radius !== undefined || query.sort === "nearest") &&
    !query.location
  ) {
    return {
      ok: false,
      errors: {
        location:
          "Enter a supported city or ZIP to use a radius or nearest-first sorting.",
      },
    };
  }
  const [resolution, locations] = await Promise.all([
    query.location ? adapter.resolve(query.location) : undefined,
    adapter.listSupported(),
  ]);
  if (resolution?.status === "unsupported")
    return {
      ok: false,
      errors: {
        location:
          "This location is not supported yet. Choose a city or ZIP from the supported list.",
      },
    };
  if (resolution?.status === "ambiguous")
    return {
      ok: false,
      errors: {
        location: "More than one city matches. Choose a city and state below.",
      },
      suggestions: resolution.candidates,
    };
  const origin =
    resolution?.status === "resolved" ? resolution.location : undefined;
  return {
    ok: true,
    results: searchPublicDirectory(
      professionals,
      catalog,
      query,
      locations,
      origin,
      reviews,
    ),
  };
}
