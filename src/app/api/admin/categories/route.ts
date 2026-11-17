import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "@/domain/config";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { authConfiguration } from "@/data/supabase/auth-config";
import { createRequestSupabaseClient } from "@/data/supabase/server";
import { preventSharedCaching } from "@/data/supabase/cache";
import { readQaBody } from "@/data/supabase/qa-handler";
import { QaDataError } from "@/data/supabase/qa";
import {
  adminCategories,
  CategoryDataError,
} from "@/data/supabase/admin-categories";
import { parseCategoryMutation } from "@/validation/admin-categories";
export const GET = (r: NextRequest) => handle(r);
export const POST = (r: NextRequest) => handle(r);
export const PATCH = (r: NextRequest) => handle(r);
async function handle(request: NextRequest) {
  const carrier = new NextResponse();
  preventSharedCaching(carrier.headers);
  carrier.headers.set("Referrer-Policy", "no-referrer");
  const json = (body: unknown, status = 200) => {
    const headers = new Headers(carrier.headers);
    headers.delete("set-cookie");
    const response = NextResponse.json(body, { status, headers });
    carrier.cookies.getAll().forEach((c) => response.cookies.set(c));
    return response;
  };
  if (applicationMode(process.env) !== "staging")
    return json({ error: "Not available in demo mode." }, 404);
  if (
    request.method !== "GET" &&
    (request.headers.get("origin") !== authConfiguration().origin ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    return json({ error: "This request is not allowed." }, 403);
  if (request.nextUrl.search)
    return json({ error: "Use only category management fields." }, 400);
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
      return json(
        { error: "Sign in with a confirmed administrator account." },
        401,
      );
    if (request.method === "GET") return json(await adminCategories(client));
    const input = parseCategoryMutation(await readQaBody(request));
    if (
      !input ||
      (request.method === "POST"
        ? input.action !== "create"
        : input.action !== "rename")
    )
      return json(
        {
          error:
            "Use only the permitted category fields, a saved version and a reason.",
        },
        400,
      );
    return json(await adminCategories(client, input));
  } catch (e) {
    return json(
      {
        error:
          e instanceof CategoryDataError || e instanceof QaDataError
            ? e.message
            : "Categories are temporarily unavailable. Your draft is retained.",
      },
      e instanceof CategoryDataError || e instanceof QaDataError
        ? e.status
        : 503,
    );
  }
}
