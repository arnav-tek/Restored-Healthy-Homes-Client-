import type { Category } from "../domain/categories";
import {
  defaultSearch,
  minimumRatings,
  type SearchQuery,
  type SearchErrors,
  type SearchField,
} from "../domain/directory-search";
import { usStates } from "../domain/us-states";
export type RawSearchParams = Record<string, string | string[] | undefined>;
export function parseSearchQuery(
  params: RawSearchParams,
  catalog: readonly Category[],
): { query: SearchQuery; errors: SearchErrors } {
  const query = { ...defaultSearch };
  const errors: SearchErrors = {};
  const read = (field: SearchField, max: number) => {
    const value = params[field];
    if (Array.isArray(value)) {
      errors[field] = "Use only one value for this filter.";
      return "";
    }
    const text = (value ?? "").trim().replace(/\s+/g, " ");
    if (text.length > max) {
      errors[field] = `Use ${max} characters or fewer.`;
      return "";
    }
    return text;
  };
  query.q = read("q", 100);
  query.location = read("location", 80);
  const state = read("state", 2).toUpperCase();
  if (!state || usStates.some(([code]) => code === state)) query.state = state;
  else errors.state = "Choose an available state.";
  const minRating = read("minRating", 3);
  if (minRating) {
    if (
      /^[1-5](?:\.5)?$/.test(minRating) &&
      minimumRatings.some((value) => value === Number(minRating))
    )
      query.minRating = Number(minRating);
    else errors.minRating = "Choose an available minimum rating.";
  }
  const category = read("category", 80);
  if (parseDirectoryQuery(category, catalog).valid) query.category = category;
  else errors.category = "Choose one of the eight available categories.";
  const radius = read("radius", 3);
  if (radius) {
    if (/^\d+$/.test(radius) && Number(radius) >= 1 && Number(radius) <= 500)
      query.radius = Number(radius);
    else
      errors.radius =
        "Enter a whole number from 1 to 500 miles, or leave blank for this city only.";
  }
  const sort = read("sort", 10);
  if (sort === "az" || sort === "za" || sort === "nearest") query.sort = sort;
  else if (sort) errors.sort = "Choose an available sort order.";
  const page = read("page", 5);
  if (page) {
    if (/^[1-9]\d*$/.test(page) && Number(page) <= 10000)
      query.page = Number(page);
    else errors.page = "Page must be a whole number from 1 to 10000.";
  }
  if (!query.location && (radius || query.sort === "nearest"))
    errors.location ??=
      "Enter a city or ZIP to use a radius or nearest-first sorting.";
  return { query, errors };
}
export type DirectoryQuery =
  { valid: true; categoryId?: string } | { valid: false };
export function parseDirectoryQuery(
  value: string | string[] | undefined,
  catalog: readonly Category[],
): DirectoryQuery {
  if (value === undefined || value === "") return { valid: true };
  if (typeof value !== "string" || value.length > 80) return { valid: false };
  return catalog.some((item) => item.id === value)
    ? { valid: true, categoryId: value }
    : { valid: false };
}
