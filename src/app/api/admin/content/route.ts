import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "@/domain/config";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { authConfiguration } from "@/data/supabase/auth-config";
import { createRequestSupabaseClient } from "@/data/supabase/server";
import { preventSharedCaching } from "@/data/supabase/cache";
import { readQaBody } from "@/data/supabase/qa-handler";
import { QaDataError } from "@/data/supabase/qa";
import { aboutAssetsAvailable } from "@/data/supabase/content-assets";
import { adminContent, ContentDataError } from "@/data/supabase/site-content";
import { parseContentMutation, contentQuery } from "@/validation/site-content";
export const GET = (r: NextRequest) => handle(r);
export const POST = (r: NextRequest) => handle(r);
async function handle(request: NextRequest) {
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
      return json(
        { error: "Sign in with a confirmed administrator account." },
        401,
      );
    if (request.method === "GET") {
      const query = contentQuery(request.nextUrl.searchParams);
      return query
        ? json(await adminContent(client, query))
        : json({ error: "Invalid content query." }, 400);
    }
    if (request.nextUrl.search)
      return json({ error: "Use only editor fields." }, 400);
    const input = parseContentMutation(await readQaBody(request, 262144));
    if (!input)
      return json(
        {
          error:
            "Check the content fields, saved version and reason. Your draft is retained.",
        },
        400,
      );
    if (input.action === "publish" && input.kind === "about") {
      const saved = await adminContent(client, { action: "get", id: input.id });
      if (
        saved.items[0] &&
        !(await aboutAssetsAvailable(saved.items[0].fields))
      )
        return json(
          {
            error:
              "Install the approved video/captions/poster assets before publishing. Your saved draft is retained.",
          },
          400,
        );
    }
    return json(await adminContent(client, input));
  } catch (e) {
    return json(
      {
        error:
          e instanceof ContentDataError || e instanceof QaDataError
            ? e.message
            : "Content is temporarily unavailable. Your draft is retained.",
      },
      e instanceof ContentDataError || e instanceof QaDataError
        ? e.status
        : 503,
    );
  }
}
