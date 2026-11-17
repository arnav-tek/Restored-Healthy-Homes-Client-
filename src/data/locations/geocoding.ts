import "server-only";
import { createHash, createHmac } from "node:crypto";
import { isRecord } from "../../validation/member-account";
import { usStates } from "../../domain/us-states";
import {
  locationQuery,
  parseSearchLocation,
  type SearchLocation,
} from "../../domain/connected-location";
import { createPublicSupabaseClient } from "../supabase/public-directory";
export class LocationError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function projectGeocodes(value: unknown, query: string) {
  if (!isRecord(value) || !Array.isArray(value.results))
    throw new LocationError(503, "Location lookup is temporarily unavailable.");
  const zip = /^\d{5}$/.test(query);
  const state = query.match(/(?:,\s*|\s)([A-Za-z]{2})$/)?.[1]?.toUpperCase();
  const city = query
    .replace(/(?:,\s*|\s)[A-Za-z]{2}$/, "")
    .trim()
    .toLowerCase();
  return value.results
    .slice(0, 5)
    .flatMap((p): Omit<SearchLocation, "id" | "label">[] => {
      if (
        !isRecord(p) ||
        !isRecord(p.datasource) ||
        p.datasource.sourcename !== "openstreetmap" ||
        p.country_code !== "us" ||
        p.result_type !== (zip ? "postcode" : "city") ||
        typeof p.city !== "string" ||
        p.city.length > 80 ||
        typeof p.state_code !== "string" ||
        !usStates.some(([s]) => s === p.state_code) ||
        (state && state !== p.state_code) ||
        (!zip && p.city.toLowerCase() !== city) ||
        (zip && p.postcode !== query) ||
        typeof p.lat !== "number" ||
        !Number.isFinite(p.lat) ||
        Math.abs(p.lat) > 90 ||
        typeof p.lon !== "number" ||
        !Number.isFinite(p.lon) ||
        Math.abs(p.lon) > 180
      )
        return [];
      return [
        {
          city: p.city,
          state: p.state_code,
          zip: zip ? query : "",
          latitude: p.lat,
          longitude: p.lon,
          kind: zip ? "postcode" : "city",
        },
      ];
    });
}
export async function lookupLocation(
  raw: unknown,
  clientAddress: string,
): Promise<SearchLocation[]> {
  const query = locationQuery(raw);
  if (!query)
    throw new LocationError(
      400,
      "Enter a five-digit US ZIP or a city, optionally followed by its state abbreviation.",
    );
  const key = process.env.GEOAPIFY_API_KEY,
    gateway = process.env.RHH_LOCATION_GATEWAY_KEY;
  if (!key || !gateway || gateway.length < 32)
    throw new LocationError(
      503,
      "City and ZIP lookup is not available yet. Search by state or specialty instead.",
    );
  const budget = Number(process.env.GEOAPIFY_DAILY_BUDGET ?? 2400);
  if (!Number.isSafeInteger(budget) || budget < 1 || budget > 2800)
    throw new LocationError(503, "Location lookup is temporarily unavailable.");
  const queryHash = createHash("sha256")
    .update(query.toLowerCase())
    .digest("hex");
  const clientHash = createHmac("sha256", gateway)
    .update(clientAddress)
    .digest("hex");
  const client = createPublicSupabaseClient();
  const gate = async (
    operation: string,
    extra: Record<string, unknown> = {},
  ) => {
    const { data, error } = await client.rpc("rhh_geocoding", {
      gateway,
      operation,
      payload: { queryHash, clientHash, budget, ...extra },
    });
    if (error || !isRecord(data))
      throw new LocationError(
        503,
        "Location lookup is temporarily unavailable.",
      );
    if (data.state === "budget")
      throw new LocationError(
        503,
        "Today's location lookup allowance has been reached. Search by state or try again tomorrow.",
      );
    if (data.state === "limited" || data.state === "busy")
      throw new LocationError(
        429,
        "Location lookup is busy. Wait a moment and try again.",
      );
    return data;
  };
  let grant = await gate("begin");
  if (grant.state === "lookup") {
    for (let attempt = 0; attempt < 2; attempt++) {
      const url = new URL("https://api.geoapify.com/v1/geocode/search");
      url.search = new URLSearchParams({
        text: query,
        type: /^\d{5}$/.test(query) ? "postcode" : "city",
        filter: "countrycode:us",
        limit: "5",
        format: "json",
        lang: "en",
        apiKey: key,
      }).toString();
      let response: Response;
      try {
        response = await fetch(url, {
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(6000),
        });
      } catch {
        if (!attempt) {
          grant = await gate("retry", { lease: grant.lease });
          continue;
        }
        throw new LocationError(
          503,
          "Location lookup timed out. Your search has not been changed.",
        );
      }
      if (response.status === 429)
        throw new LocationError(
          429,
          "Location lookup is temporarily busy. Please try again later.",
        );
      if (!response.ok) {
        if (response.status >= 500 && !attempt) {
          grant = await gate("retry", { lease: grant.lease });
          continue;
        }
        throw new LocationError(
          503,
          "Location lookup is temporarily unavailable.",
        );
      }
      // Bound response bytes before parsing; provider diagnostics/headers never leave this adapter.
      const reader = response.body?.getReader();
      let bytes = 0;
      const chunks: Uint8Array[] = [];
      if (!reader)
        throw new LocationError(
          503,
          "Location lookup is temporarily unavailable.",
        );
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 65536) {
          await reader.cancel();
          throw new LocationError(
            503,
            "Location lookup is temporarily unavailable.",
          );
        }
        chunks.push(value);
      }
      const joined = Buffer.concat(chunks);
      let body: unknown;
      try {
        body = JSON.parse(joined.toString("utf8"));
      } catch {
        throw new LocationError(
          503,
          "Location lookup is temporarily unavailable.",
        );
      }
      const places = projectGeocodes(body, query);
      grant = await gate("complete", { lease: grant.lease, places });
      break;
    }
  }
  if (!Array.isArray(grant.places))
    throw new LocationError(503, "Location lookup is temporarily unavailable.");
  const places = grant.places.map(parseSearchLocation);
  if (places.some((p) => !p))
    throw new LocationError(503, "Location lookup is temporarily unavailable.");
  return places as SearchLocation[];
}
