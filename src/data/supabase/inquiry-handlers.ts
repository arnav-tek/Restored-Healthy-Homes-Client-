import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "../../domain/config";
import { authenticatedIdentity } from "./auth";
import { authConfiguration } from "./auth-config";
import { preventSharedCaching } from "./cache";
import { createRequestSupabaseClient } from "./server";
import {
  InboxError,
  loadInbox,
  loadInquiry,
  setInquiryRead,
  submitInquiry,
} from "./inbox";
import {
  inquiryUuid,
  parseInboxPage,
  parseInquiryReadState,
  parseInquirySubmission,
} from "../../validation/connected-inquiry";

async function readBody(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new InboxError(415, "Use a JSON request.");
  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let size = 0,
    raw = "";
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16384) {
        await reader.cancel();
        throw new InboxError(413, "This inquiry is too large.");
      }
      raw += decoder.decode(value, { stream: true });
    }
  }
  try {
    return JSON.parse(raw + decoder.decode());
  } catch {
    throw new InboxError(400, "Check the form and try again.");
  }
}
export async function handleInquiryRequest(
  request: NextRequest,
  publicSubmission = false,
) {
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
  if (
    (publicSubmission && request.method !== "POST") ||
    (!publicSubmission && !["GET", "PATCH"].includes(request.method))
  )
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
    if (publicSubmission) {
      if (request.nextUrl.search)
        throw new InboxError(400, "Use only the inquiry form fields.");
      const parsed = parseInquirySubmission(await readBody(request));
      if (!parsed.ok)
        return json(
          {
            error: parsed.error,
            errors: "errors" in parsed ? parsed.errors : undefined,
          },
          400,
        );
      return json(await submitInquiry(client, parsed.input));
    }
    if (!(await authenticatedIdentity(client)))
      return json(
        { error: "Sign in with a confirmed email address to open your inbox." },
        401,
      );
    const query = request.nextUrl.searchParams;
    if (request.method === "PATCH") {
      if (query.size)
        throw new InboxError(400, "Use only the read-state fields.");
      const parsed = parseInquiryReadState(await readBody(request));
      if (!parsed)
        throw new InboxError(400, "Only inquiry read state can be changed.");
      return json(
        await setInquiryRead(client, parsed.id, parsed.read, parsed.version),
      );
    }
    if (
      query.size > 1 ||
      [...query.keys()].some((key) => !["page", "id"].includes(key))
    )
      throw new InboxError(400, "Choose a valid inbox page or inquiry.");
    if (query.has("id")) {
      const id = query.get("id") ?? "";
      if (!inquiryUuid.test(id))
        throw new InboxError(404, "This inquiry is unavailable.");
      const detail = await loadInquiry(client, id);
      if (!detail) throw new InboxError(404, "This inquiry is unavailable.");
      return json(detail);
    }
    const page = parseInboxPage(query.get("page"));
    if (!page) throw new InboxError(400, "Choose a valid inbox page.");
    return json(await loadInbox(client, page));
  } catch (error) {
    return error instanceof InboxError
      ? json({ error: error.message }, error.status)
      : json(
          {
            error:
              "The inquiry service is temporarily unavailable. Your draft has not been cleared.",
          },
          503,
        );
  }
}
