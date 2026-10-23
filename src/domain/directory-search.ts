import type { Category } from "./categories";
import type { PublicProfessional } from "./professional";
import type { DemoLocation } from "./location";
import { approximateMiles } from "./location";
import { summarizeReviews, type PublicReview } from "./review";
export const minimumRatings = [1, 2, 3, 4, 4.5, 5] as const;
export const DIRECTORY_PAGE_SIZE = 6;
export interface SearchQuery {
  q: string;
  category: string;
  location: string;
  state: string;
  minRating?: number;
  radius?: number;
  sort: "az" | "za" | "nearest";
  page: number;
}
export const defaultSearch: SearchQuery = {
  q: "",
  category: "",
  location: "",
  state: "",
  sort: "az",
  page: 1,
};
export type SearchField = keyof SearchQuery;
export type SearchErrors = Partial<Record<SearchField, string>>;
export interface SearchHit {
  professional: PublicProfessional;
  distanceMiles?: number;
  reviewSummary: ReturnType<typeof summarizeReviews>;
}
export interface SearchResults {
  hits: SearchHit[];
  total: number;
  page: number;
  pages: number;
  origin?: DemoLocation;
  missingCoordinates: number;
}
export type SearchResponse =
  | { ok: true; results: SearchResults }
  | { ok: false; errors: SearchErrors; suggestions?: readonly DemoLocation[] };
export function directoryHref(query: SearchQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.location) params.set("location", query.location);
  if (query.state) params.set("state", query.state);
  if (query.minRating !== undefined)
    params.set("minRating", String(query.minRating));
  if (query.radius !== undefined) params.set("radius", String(query.radius));
  if (query.sort !== "az") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  return `/directory${params.size ? `?${params}` : ""}`;
}
// Receives only eligible public DTOs from the repository, never private records.
export function searchPublicDirectory(
  professionals: readonly PublicProfessional[],
  catalog: readonly Category[],
  query: SearchQuery,
  locations: readonly DemoLocation[],
  origin?: DemoLocation,
  reviews: readonly PublicReview[] = [],
): SearchResults {
  const sameCity = (left: string, right: string) =>
    left.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US") ===
    right.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
  const terms = query.q.toLocaleLowerCase("en-US").split(/\s+/).filter(Boolean);
  let hits = professionals
    .filter((professional) => {
      if (query.category && !professional.categoryIds.includes(query.category))
        return false;
      if (
        query.state &&
        professional.state.trim().toUpperCase() !== query.state
      )
        return false;
      const text = [
        professional.businessName,
        professional.specialty,
        professional.summary,
        ...professional.services,
        ...professional.categoryIds.map(
          (id) => catalog.find((category) => category.id === id)?.name ?? "",
        ),
      ]
        .join(" ")
        .toLocaleLowerCase("en-US");
      return terms.every((term) => text.includes(term));
    })
    .map((professional): SearchHit => {
      const place = locations.find(
        (item) =>
          sameCity(item.city, professional.city) &&
          item.state === professional.state,
      );
      const distanceMiles =
        origin && place
          ? approximateMiles(origin.coordinates, place.coordinates)
          : undefined;
      return {
        professional,
        reviewSummary: summarizeReviews(
          reviews.filter((review) => review.professionalId === professional.id),
        ),
        ...(distanceMiles === undefined ? {} : { distanceMiles }),
      };
    })
    .filter(
      ({ reviewSummary }) =>
        query.minRating === undefined ||
        (reviewSummary.average !== null &&
          reviewSummary.average >= query.minRating),
    );
  const missingCoordinates = origin
    ? hits.filter((hit) => hit.distanceMiles === undefined).length
    : 0;
  if (origin) {
    hits = hits.filter(({ professional, distanceMiles }) =>
      query.radius === undefined
        ? sameCity(professional.city, origin.city) &&
          professional.state === origin.state
        : distanceMiles !== undefined && distanceMiles <= query.radius,
    );
  }
  const alphabetic = (a: SearchHit, b: SearchHit) =>
    a.professional.businessName.localeCompare(
      b.professional.businessName,
      "en-US",
      { sensitivity: "base" },
    ) || a.professional.id.localeCompare(b.professional.id);
  hits.sort((a, b) => {
    if (query.sort === "nearest") {
      if (a.distanceMiles === undefined && b.distanceMiles !== undefined)
        return 1;
      if (b.distanceMiles === undefined && a.distanceMiles !== undefined)
        return -1;
      if (
        a.distanceMiles !== undefined &&
        b.distanceMiles !== undefined &&
        a.distanceMiles !== b.distanceMiles
      )
        return a.distanceMiles - b.distanceMiles;
    }
    return query.sort === "za" ? -alphabetic(a, b) : alphabetic(a, b);
  });
  const total = hits.length;
  const pages = Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE));
  const page = Math.min(query.page, pages);
  return {
    hits: hits.slice(
      (page - 1) * DIRECTORY_PAGE_SIZE,
      page * DIRECTORY_PAGE_SIZE,
    ),
    total,
    page,
    pages,
    origin,
    missingCoordinates,
  };
}
