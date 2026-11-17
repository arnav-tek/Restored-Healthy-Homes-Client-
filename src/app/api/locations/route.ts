import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "@/domain/config";
import { authConfiguration } from "@/data/supabase/auth-config";
import { preventSharedCaching } from "@/data/supabase/cache";
import { readLimited } from "@/data/media/http";
import { lookupLocation, LocationError } from "@/data/locations/geocoding";
export async function POST(request: NextRequest) {
  const headers = new Headers();
  preventSharedCaching(headers);
  headers.set("Referrer-Policy", "no-referrer");
  const reply = (data: unknown, status = 200) =>
    NextResponse.json(data, { status, headers });
  if (applicationMode(process.env) !== "staging")
    return reply({ error: "Not available in demo mode." }, 404);
  if (
    request.headers.get("origin") !== authConfiguration().origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return reply({ error: "This request is not allowed." }, 403);
  try {
    if (
      request.nextUrl.search ||
      !request.headers.get("content-type")?.startsWith("application/json")
    )
      throw new LocationError(400, "Use the location search form.");
    const raw: unknown = JSON.parse(
      Buffer.from(await readLimited(request, 1024)).toString("utf8"),
    );
    if (
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      Object.keys(raw).some((k) => k !== "query")
    )
      throw new LocationError(400, "Use only a city or ZIP query.");
    // Only trust the hosting platform's overwritten address header. Local/other hosts share a conservative bucket.
    const address = process.env.VERCEL
      ? (request.headers
          .get("x-vercel-forwarded-for")
          ?.split(",")[0]
          ?.slice(0, 64) ?? "shared")
      : "shared";
    return reply({
      places: await lookupLocation((raw as { query?: unknown }).query, address),
    });
  } catch (e) {
    return reply(
      {
        error:
          e instanceof LocationError
            ? e.message
            : "Location lookup is temporarily unavailable.",
      },
      e instanceof LocationError ? e.status : 503,
    );
  }
}
