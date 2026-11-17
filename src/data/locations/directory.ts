import "server-only";
import {
  createPublicSupabaseClient,
  projectPublicDirectory,
} from "../supabase/public-directory";
import {
  parseSearchLocation,
  type SearchLocation,
  searchRadii,
} from "../../domain/connected-location";
import type { SearchQuery, SearchHit } from "../../domain/directory-search";
import { summarizeReviews } from "../../domain/review";
import { isRecord } from "../../validation/member-account";
export interface ResultMapPoint {
  id: string;
  businessName: string;
  summary: string;
  location: SearchLocation;
}
export async function searchConnectedDirectory(query: SearchQuery) {
  if (
    query.radius !== undefined &&
    !searchRadii.some((n) => n === query.radius)
  )
    throw Error("Choose a distance of 10, 25, 50 or 100 miles.");
  if (query.location && !query.place)
    throw Error("Choose the intended city or ZIP before searching.");
  const client = createPublicSupabaseClient();
  const { data, error } = await client.rpc("rhh_directory_search", {
    filters: { ...query },
  });
  if (error)
    throw Error(
      error.message === "location_unavailable"
        ? "This search origin is unavailable. Choose the city or ZIP again."
        : "The directory is temporarily unavailable. Please try again later.",
    );
  if (!isRecord(data) || !Array.isArray(data.locations))
    throw Error("Directory response is unavailable.");
  const routes = data.locations;
  const snapshot = projectPublicDirectory(data);
  const ints = [data.total, data.page, data.pages, data.missingCoordinates];
  if (
    !ints.every((n) => Number.isSafeInteger(n) && Number(n) >= 0) ||
    Number(data.page) < 1 ||
    Number(data.pages) < 1 ||
    snapshot.profiles.length > 6
  )
    throw Error("Directory response is unavailable.");
  const origin = data.origin === null ? null : parseSearchLocation(data.origin);
  if (data.origin !== null && !origin)
    throw Error("Directory response is unavailable.");
  const points: ResultMapPoint[] = [];
  const hits: SearchHit[] = snapshot.profiles.map((professional) => {
    const route = routes.find(
      (r: unknown) => isRecord(r) && r.professionalId === professional.id,
    );
    if (!isRecord(route)) throw Error("Directory response is unavailable.");
    const place =
      route.location === null ? null : parseSearchLocation(route.location);
    if (route.location !== null && !place)
      throw Error("Directory response is unavailable.");
    if (place)
      points.push({
        id: professional.id,
        businessName: professional.businessName,
        summary: professional.summary,
        location: place,
      });
    if (
      route.distanceMiles !== null &&
      (typeof route.distanceMiles !== "number" ||
        !Number.isFinite(route.distanceMiles) ||
        route.distanceMiles < 0)
    )
      throw Error("Directory response is unavailable.");
    return {
      professional,
      reviewSummary: summarizeReviews(
        snapshot.reviews.filter((r) => r.professionalId === professional.id),
      ),
      ...(typeof route.distanceMiles === "number"
        ? { distanceMiles: route.distanceMiles }
        : {}),
    };
  });
  return {
    hits,
    points,
    origin,
    total: Number(data.total),
    page: Number(data.page),
    pages: Number(data.pages),
    missingCoordinates: Number(data.missingCoordinates),
  };
}
