import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "../../domain/config";
import { authenticatedIdentity } from "./auth";
import { authConfiguration } from "./auth-config";
import { preventSharedCaching } from "./cache";
import { createRequestSupabaseClient } from "./server";
import {
  loadNotificationJobs,
  NotificationOperationError,
  retryNotificationJob,
} from "./inquiry-notifications";
import {
  inquiryUuid,
  parseInboxPage,
} from "../../validation/connected-inquiry";
import { isRecord } from "../../validation/member-account";
import { parseReviewReason } from "../../validation/admin";

export async function handleNotificationAdmin(request: NextRequest) {
  const carrier = new NextResponse();
  preventSharedCaching(carrier.headers);
  carrier.headers.set("Referrer-Policy", "no-referrer");
  const json = (body: unknown, status = 200) => {
    const headers = new Headers(carrier.headers);
    headers.delete("set-cookie");
    const response = NextResponse.json(body, { status, headers });
    carrier.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };
  if (applicationMode(process.env) !== "staging")
    return json({ error: "Not available in demo mode." }, 404);
  if (!["GET", "POST"].includes(request.method))
    return json({ error: "Method not allowed." }, 405);
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
      Object.entries(headers).forEach(([name, value]) =>
        carrier.headers.set(name, value),
      );
    },
  });
  try {
    if (!(await authenticatedIdentity(client)))
      return json({ error: "Sign in with a confirmed email address." }, 401);
    const page = parseInboxPage(request.nextUrl.searchParams.get("page"));
    if (
      !page ||
      request.nextUrl.searchParams.size > 1 ||
      [...request.nextUrl.searchParams.keys()].some((k) => k !== "page")
    )
      return json({ error: "Choose a valid operations page." }, 400);
    const jobs = await loadNotificationJobs(client, page);
    if (request.method === "GET") return json(jobs);
    if (request.nextUrl.search)
      return json(
        { error: "Retry requests do not accept query parameters." },
        400,
      );
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return json({ error: "Use a JSON request." }, 415);
    const reader = request.body?.getReader();
    let size = 0,
      raw = "";
    const decoder = new TextDecoder();
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2048) {
          await reader.cancel();
          return json({ error: "Retry request is too large." }, 413);
        }
        raw += decoder.decode(value, { stream: true });
      }
    let body: unknown;
    try {
      body = JSON.parse(raw + decoder.decode());
    } catch {
      return json({ error: "Check the retry request." }, 400);
    }
    if (
      !isRecord(body) ||
      Object.keys(body).length !== 3 ||
      Object.keys(body).some((k) => !["id", "version", "reason"].includes(k)) ||
      typeof body.id !== "string" ||
      !inquiryUuid.test(body.id) ||
      !Number.isSafeInteger(body.version) ||
      Number(body.version) < 1 ||
      typeof body.reason !== "string" ||
      !parseReviewReason(body.reason)
    )
      return json(
        {
          error:
            "Enter a valid job, saved version and a reason of 3–300 characters.",
        },
        400,
      );
    return json(
      await retryNotificationJob(
        client,
        body.id,
        Number(body.version),
        body.reason.trim(),
      ),
    );
  } catch (error) {
    return error instanceof NotificationOperationError
      ? json({ error: error.message }, error.status)
      : json(
          { error: "Notification operations are temporarily unavailable." },
          503,
        );
  }
}
