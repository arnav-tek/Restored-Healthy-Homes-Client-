import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "@/domain/config";
import { authenticatedIdentity } from "./auth";
import { authConfiguration } from "./auth-config";
import { createRequestSupabaseClient } from "./server";
import { preventSharedCaching } from "./cache";
import { readQaBody } from "./qa-handler";
import { QaDataError } from "./qa";
import { adminOperations, OperationsDataError } from "./admin-operations";
import {
  operationsQuery,
  parseOperationsInput,
} from "@/validation/admin-operations";
export async function handleOperations(request: NextRequest, report = false) {
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
  if (report && request.method !== "GET")
    return json({ error: "Method not allowed." }, 405);
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
      const input = operationsQuery(request.nextUrl.searchParams, report);
      return input
        ? json(await adminOperations(client, input))
        : json({ error: "Invalid operations query." }, 400);
    }
    if (request.nextUrl.search)
      return json({ error: "Use only the permitted selection fields." }, 400);
    const input = parseOperationsInput(await readQaBody(request));
    if (!input || input.action !== "set_featured")
      return json(
        {
          error:
            "Check the selection, saved version and reason. Your draft is retained.",
        },
        400,
      );
    return json(await adminOperations(client, input));
  } catch (e) {
    return json(
      {
        error:
          e instanceof OperationsDataError || e instanceof QaDataError
            ? e.message
            : "Operations data is temporarily unavailable. Your draft is retained.",
      },
      e instanceof OperationsDataError || e instanceof QaDataError
        ? e.status
        : 503,
    );
  }
}
