import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "../../domain/config";
import { authConfiguration } from "./auth-config";
import { authenticatedIdentity } from "./auth";
import { createRequestSupabaseClient } from "./server";
import { preventSharedCaching } from "./cache";
import { loadAdminQa, moderateQa, QaAdminError } from "./qa-admin";
import {
  parseQaAdminFilters,
  parseQaDecision,
} from "../../validation/qa-admin";
import { readQaBody } from "./qa-handler";
import { QaDataError } from "./qa";
export async function handleAdminQa(request: NextRequest) {
  const carrier = new NextResponse();
  preventSharedCaching(carrier.headers);
  carrier.headers.set("Referrer-Policy", "no-referrer");
  const json = (data: unknown, status = 200) => {
    const headers = new Headers(carrier.headers);
    headers.delete("set-cookie");
    const r = NextResponse.json(data, { status, headers });
    carrier.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };
  if (applicationMode(process.env) !== "staging")
    return json({ error: "Not available in demo mode." }, 404);
  if (
    request.method !== "GET" &&
    (request.headers.get("origin") !== authConfiguration().origin ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    return json({ error: "This request is not allowed." }, 403);
  try {
    const client = createRequestSupabaseClient({
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        cookies.forEach(({ name, value, options }) =>
          carrier.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => carrier.headers.set(k, v));
      },
    });
    if (!(await authenticatedIdentity(client)))
      return json({ error: "Sign in with a confirmed account." }, 401);
    if (request.method === "GET") {
      const params = request.nextUrl.searchParams;
      if ([...params.keys()].some((k) => params.getAll(k).length > 1))
        return json({ error: "Use one value per filter." }, 400);
      const filters = parseQaAdminFilters(Object.fromEntries(params));
      return filters
        ? json(await loadAdminQa(client, filters))
        : json({ error: "Choose valid moderation filters." }, 400);
    }
    if (request.method !== "POST")
      return json({ error: "Method not allowed." }, 405);
    if (request.nextUrl.search)
      return json({ error: "Unexpected decision parameters." }, 400);
    const parsed = parseQaDecision(await readQaBody(request));
    return parsed
      ? json(await moderateQa(client, parsed))
      : json(
          {
            error:
              "Choose a valid saved version, decision, reason (3–300 characters) and private note (up to 500 characters). Protected fields are not accepted.",
          },
          400,
        );
  } catch (error) {
    return error instanceof QaAdminError || error instanceof QaDataError
      ? json({ error: error.message }, error.status)
      : json(
          {
            error:
              "Moderation is unavailable. Your draft has not been cleared.",
          },
          503,
        );
  }
}
