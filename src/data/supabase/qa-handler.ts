import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "../../domain/config";
import { authenticatedIdentity } from "./auth";
import { authConfiguration } from "./auth-config";
import { createRequestSupabaseClient } from "./server";
import { preventSharedCaching } from "./cache";
import {
  QaDataError,
  loadPublicQa,
  memberQa,
  submitAnswer,
  submitQuestion,
} from "./qa";
import {
  parseQuestionPayload,
  parseAnswerPayload,
} from "../../validation/connected-qa";
import {
  inquiryUuid,
  parseInboxPage,
} from "../../validation/connected-inquiry";
export async function readQaBody(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new QaDataError(415, "Use a JSON request.");
  if (Number(request.headers.get("content-length")) > 16384)
    throw new QaDataError(413, "The submission is too large.");
  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let raw = "",
    size = 0;
  if (reader)
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16384) {
        await reader.cancel();
        throw new QaDataError(413, "The submission is too large.");
      }
      raw += decoder.decode(value, { stream: true });
    }
  try {
    return JSON.parse(raw + decoder.decode());
  } catch {
    throw new QaDataError(400, "Check the form and try again.");
  }
}
export async function handleQaRequest(
  request: NextRequest,
  publicSubmission = false,
) {
  const carrier = new NextResponse();
  preventSharedCaching(carrier.headers);
  carrier.headers.set("Referrer-Policy", "no-referrer");
  const json = (data: unknown, status = 200) => {
    const headers = new Headers(carrier.headers);
    headers.delete("set-cookie");
    const response = NextResponse.json(data, { status, headers });
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
  try {
    if (publicSubmission) {
      if (request.method !== "POST")
        return json({ error: "Method not allowed." }, 405);
      if (request.nextUrl.search)
        return json({ error: "Unexpected submission parameters." }, 400);
      const raw = await readQaBody(request);
      const data = await loadPublicQa();
      const parsed = parseQuestionPayload(
        raw,
        data.catalog.filter((c) => c.active),
      );
      if (!parsed)
        return json(
          {
            error:
              "Check the question fields and category. Protected fields are not accepted.",
          },
          400,
        );
      return json(await submitQuestion(parsed));
    }
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
    if (!(await authenticatedIdentity(client)))
      return json({ error: "Sign in with a confirmed member account." }, 401);
    if (request.method === "GET") {
      const target = request.nextUrl.searchParams.get("question"),
        page = parseInboxPage(request.nextUrl.searchParams.get("page"));
      if (
        !page ||
        (target && !inquiryUuid.test(target)) ||
        [...request.nextUrl.searchParams.keys()].some(
          (k) => !["question", "page"].includes(k),
        ) ||
        request.nextUrl.searchParams.getAll("question").length > 1 ||
        request.nextUrl.searchParams.getAll("page").length > 1
      )
        return json({ error: "Choose a valid category inbox page." }, 400);
      return json(await memberQa(client, target, page));
    }
    if (request.method !== "POST")
      return json({ error: "Method not allowed." }, 405);
    if (request.nextUrl.search)
      return json({ error: "Unexpected submission parameters." }, 400);
    const parsed = parseAnswerPayload(await readQaBody(request));
    if (!parsed)
      return json(
        {
          error:
            "Use a valid question, answer of 20–3,000 characters and saved version. Author and publication fields are not accepted.",
        },
        400,
      );
    return json(await submitAnswer(client, parsed));
  } catch (error) {
    return error instanceof QaDataError
      ? json({ error: error.message }, error.status)
      : json(
          {
            error:
              "Q&A is temporarily unavailable. Your draft has not been cleared.",
          },
          503,
        );
  }
}
