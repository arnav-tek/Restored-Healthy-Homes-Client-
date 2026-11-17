import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "@/domain/config";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { authConfiguration } from "@/data/supabase/auth-config";
import { createRequestSupabaseClient } from "@/data/supabase/server";
import { preventSharedCaching } from "@/data/supabase/cache";
import { readLimited } from "@/data/media/http";
import { parseSearchLocation } from "@/domain/connected-location";
export async function GET(request: NextRequest) {
  return handle(request);
}
export async function PATCH(request: NextRequest) {
  return handle(request);
}
async function handle(request: NextRequest) {
  const carrier = new NextResponse();
  preventSharedCaching(carrier.headers);
  carrier.headers.set("Referrer-Policy", "no-referrer");
  const json = (body: unknown, status = 200) => {
    const headers = new Headers(carrier.headers);
    headers.delete("set-cookie");
    const r = NextResponse.json(body, { status, headers });
    carrier.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };
  if (applicationMode(process.env) !== "staging")
    return json({ error: "Not available in demo mode." }, 404);
  if (request.nextUrl.search)
    return json({ error: "Use only the location controls." }, 400);
  if (
    request.method !== "GET" &&
    (request.headers.get("origin") !== authConfiguration().origin ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    return json({ error: "This request is not allowed." }, 403);
  const client = createRequestSupabaseClient({
    getAll: () => request.cookies.getAll(),
    setAll(cookies, headers) {
      cookies.forEach(({ name, value, options }) =>
        carrier.cookies.set(name, value, options),
      );
      Object.entries(headers).forEach(([k, v]) => carrier.headers.set(k, v));
    },
  });
  try {
    if (!(await authenticatedIdentity(client)))
      return json({ error: "Sign in with a confirmed member account." }, 401);
    let payload: Record<string, unknown> = { action: "get" };
    if (request.method === "PATCH") {
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return json({ error: "Use a JSON request." }, 400);
      const raw: unknown = JSON.parse(
        Buffer.from(await readLimited(request, 1024)).toString("utf8"),
      );
      if (
        !raw ||
        typeof raw !== "object" ||
        Array.isArray(raw) ||
        Object.keys(raw).sort().join(",") !== "place,version"
      )
        return json(
          { error: "Only a selected location and saved version are allowed." },
          400,
        );
      const p = raw as Record<string, unknown>;
      if (
        !Number.isSafeInteger(p.version) ||
        Number(p.version) < 1 ||
        (p.place !== null &&
          (typeof p.place !== "string" ||
            !/^([a-f0-9]{8}-[a-f0-9-]{27})$/i.test(p.place)))
      )
        return json({ error: "Choose a valid saved location." }, 400);
      payload = { action: "save", place: p.place, version: p.version };
    }
    const { data, error } = await client.rpc("rhh_member_location", {
      payload,
    });
    if (error)
      return json(
        {
          error:
            error.code === "40001"
              ? "Your saved profile changed. Your location choice remains here. Compare the saved profile, then reload its version before trying again."
              : error.code === "42501"
                ? "Member location access is unavailable for this account."
                : "The location could not be saved. Your choice remains here.",
        },
        error.code === "40001" ? 409 : error.code === "42501" ? 403 : 503,
      );
    if (!data || typeof data !== "object" || Array.isArray(data)) throw Error();
    const d = data as Record<string, unknown>,
      location = d.location === null ? null : parseSearchLocation(d.location);
    if (
      !Number.isSafeInteger(d.version) ||
      Number(d.version) < 1 ||
      (d.location !== null && !location)
    )
      throw Error();
    return json({
      version: Number(d.version),
      location,
      ...(request.method === "PATCH" ? { saved: true } : {}),
    });
  } catch {
    return json(
      {
        error:
          "Saved location is temporarily unavailable. Your choice has not been cleared.",
      },
      503,
    );
  }
}
