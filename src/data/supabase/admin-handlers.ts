import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "../../domain/config";
import { authenticatedIdentity } from "./auth";
import { authConfiguration } from "./auth-config";
import { preventSharedCaching } from "./cache";
import { createRequestSupabaseClient } from "./server";
import { loadAdminWorkspace, saveAdminDecision } from "./admin-account";
import { MemberDataError } from "./member-account";
import { parseAdminDecision } from "../../validation/admin-account";

export async function handleAdminRequest(request: NextRequest) {
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
    if (request.method === "GET") return json(await loadAdminWorkspace(client));
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
        if (size > 24576) {
          await reader.cancel();
          return json({ error: "Decision submission is too large." }, 413);
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
    // Check the protected database role even before processing a valid decision.
    await loadAdminWorkspace(client);
    const input = parseAdminDecision(body);
    if (!input)
      return json(
        {
          error:
            "Enter a valid decision, a reason of 3-300 characters and notes up to 5,000 characters.",
        },
        400,
      );
    return json(await saveAdminDecision(client, input));
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
