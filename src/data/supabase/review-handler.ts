import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "../../domain/config";
import { authConfiguration } from "./auth-config";
import { authenticatedIdentity } from "./auth";
import { createRequestSupabaseClient } from "./server";
import { preventSharedCaching } from "./cache";
import { readQaBody } from "./qa-handler";
import { QaDataError } from "./qa";
import {
  parseReviewSubmission,
  parseReviewFilters,
  parseReviewDecision,
} from "../../validation/connected-reviews";
import { inquiryUuid } from "../../validation/connected-inquiry";
import {
  submitConnectedReview,
  loadMemberReviews,
  loadAdminReviews,
  moderateConnectedReview,
  ReviewDataError,
} from "./reviews";
export async function handleReviewRequest(
  request: NextRequest,
  scope: "public" | "member" | "admin",
  target?: string,
) {
  const carrier = new NextResponse();
  preventSharedCaching(carrier.headers);
  carrier.headers.set("Referrer-Policy", "no-referrer");
  const json = (data: unknown, status = 200) => {
    const h = new Headers(carrier.headers);
    h.delete("set-cookie");
    const r = NextResponse.json(data, { status, headers: h });
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
    if (scope === "public") {
      if (
        request.method !== "POST" ||
        request.nextUrl.search ||
        !target ||
        !inquiryUuid.test(target)
      )
        return json({ error: "Choose an available public profile." }, 404);
      const p = parseReviewSubmission(await readQaBody(request));
      return p
        ? json(await submitConnectedReview(target, p))
        : json(
            {
              error:
                "Check the review fields. Publication, contact and owner fields are not accepted.",
            },
            400,
          );
    }
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
    if (scope === "member") {
      if (request.method !== "GET" || request.nextUrl.search)
        return json({ error: "This operation is not available." }, 400);
      return json(await loadMemberReviews(client));
    }
    if (request.method === "GET") {
      const params = request.nextUrl.searchParams;
      if ([...params.keys()].some((k) => params.getAll(k).length > 1))
        return json({ error: "Choose one value per filter." }, 400);
      const p = parseReviewFilters(Object.fromEntries(params));
      return p
        ? json(await loadAdminReviews(client, p))
        : json({ error: "Choose valid review filters." }, 400);
    }
    if (request.method !== "POST" || request.nextUrl.search)
      return json({ error: "This operation is not available." }, 405);
    const p = parseReviewDecision(await readQaBody(request));
    return p
      ? json(await moderateConnectedReview(client, p))
      : json(
          {
            error:
              "Choose a valid version, decision, reason (3–300 characters) and private note (up to 500 characters). Rating, reviewer and content fields are not accepted.",
          },
          400,
        );
  } catch (e) {
    return e instanceof ReviewDataError || e instanceof QaDataError
      ? json({ error: e.message }, e.status)
      : json(
          {
            error: "Reviews are unavailable. Your draft has not been cleared.",
          },
          503,
        );
  }
}
