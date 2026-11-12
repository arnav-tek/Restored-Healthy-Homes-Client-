import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "../../domain/config";
import { authenticatedIdentity } from "./auth";
import { authConfiguration } from "./auth-config";
import { preventSharedCaching } from "./cache";
import { createRequestSupabaseClient } from "./server";
import {
  loadMemberWorkspace,
  saveMemberApplication,
  MemberDataError,
} from "./member-account";
import { parseMemberMutation } from "../../validation/member-account";

export async function handleMemberRequest(request: NextRequest) {
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
      return json(
        { error: "Sign in with a confirmed email address before continuing." },
        401,
      );
    if (request.method === "GET")
      return json(await loadMemberWorkspace(client));
    if (!["POST", "PATCH"].includes(request.method))
      return json({ error: "Method not allowed." }, 405);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return json({ error: "Use a JSON request." }, 415);
    const reader = request.body?.getReader();
    let size = 0,
      raw = "";
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 32768) {
          await reader.cancel();
          return json({ error: "Profile submission is too large." }, 413);
        }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Check the form and try again." }, 400);
    }
    const workspace = await loadMemberWorkspace(client);
    const parsed = parseMemberMutation(
      body,
      workspace.catalog,
      request.method === "PATCH",
    );
    if (!parsed.ok)
      return json(
        {
          error: parsed.error,
          errors: "errors" in parsed ? parsed.errors : undefined,
        },
        400,
      );
    return json(
      await saveMemberApplication(client, parsed.profile, parsed.version),
    );
  } catch (error) {
    if (error instanceof MemberDataError)
      return json(
        { error: error.message, conflict: error.kind === "conflict" },
        { conflict: 409, invalid: 400, denied: 403, unavailable: 503 }[
          error.kind
        ],
      );
    return json(
      {
        error:
          "Account service is temporarily unavailable. Your draft has not been cleared.",
      },
      503,
    );
  }
}
