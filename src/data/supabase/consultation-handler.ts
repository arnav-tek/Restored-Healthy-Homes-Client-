import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "../../domain/config";
import { authConfiguration } from "./auth-config";
import { authenticatedIdentity } from "./auth";
import { createRequestSupabaseClient } from "./server";
import { createPublicSupabaseClient } from "./public-directory";
import { preventSharedCaching } from "./cache";
import { readQaBody } from "./qa-handler";
import { QaDataError } from "./qa";
import {
  parseConsultationSubmission,
  parseConsultationAction,
  receiptToken,
  parseConsultationPreference,
} from "../../validation/connected-consultations";
import {
  inquiryUuid,
  parseInboxPage,
} from "../../validation/connected-inquiry";
import { isRecord } from "../../validation/member-account";
import {
  consultationError,
  ConsultationDataError,
  loadConsultations,
  savedConsultation,
  publicConsultationReceipt,
} from "./consultations";
const receiptCookie = "rhh_consultation_receipt";
export async function handleConsultations(
  request: NextRequest,
  scope: "public" | "admin" | "member" | "preference",
) {
  const carrier = new NextResponse();
  preventSharedCaching(carrier.headers);
  carrier.headers.set("Referrer-Policy", "no-referrer");
  const json = (value: unknown, status = 200) => {
    const h = new Headers(carrier.headers);
    h.delete("set-cookie");
    const r = NextResponse.json(value, { status, headers: h });
    carrier.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };
  if (applicationMode(process.env) !== "staging")
    return json({ error: "Unavailable in demo mode." }, 404);
  if (
    request.method !== "GET" &&
    (request.headers.get("origin") !== authConfiguration().origin ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    return json({ error: "Request not allowed." }, 403);
  try {
    if (scope === "public") {
      if (request.nextUrl.search)
        return json({ error: "Invalid request." }, 400);
      const client = createPublicSupabaseClient();
      if (request.method === "POST") {
        const payload = parseConsultationSubmission(await readQaBody(request));
        if (!payload)
          return json(
            {
              error:
                "Check your name, email, category and topic (20–2,000 characters).",
            },
            400,
          );
        const { data, error } = await client.rpc("rhh_consultation_public", {
          action: "submit",
          payload,
        });
        consultationError(error);
        const result = savedConsultation(data);
        carrier.cookies.set(
          receiptCookie,
          JSON.stringify({
            requestId: payload.requestId,
            token: payload.token,
          }),
          {
            httpOnly: true,
            secure: authConfiguration().origin.startsWith("https:"),
            sameSite: "strict",
            path: "/api/consultations",
            maxAge: 30 * 86400,
          },
        );
        return json(result);
      }
      let receipt: unknown;
      try {
        receipt = JSON.parse(
          request.cookies.get(receiptCookie)?.value ?? "null",
        );
      } catch {
        receipt = null;
      }
      if (
        !isRecord(receipt) ||
        typeof receipt.requestId !== "string" ||
        !inquiryUuid.test(receipt.requestId) ||
        typeof receipt.token !== "string" ||
        !receiptToken.test(receipt.token)
      )
        return json(
          { error: "No saved request receipt in this browser." },
          404,
        );
      const payload: Record<string, unknown> = {
        requestId: receipt.requestId,
        token: receipt.token,
      };
      if (request.method === "PATCH") {
        const body = await readQaBody(request);
        if (
          !isRecord(body) ||
          Object.keys(body).sort().join(",") !== "requestId,version" ||
          typeof body.requestId !== "string" ||
          !inquiryUuid.test(body.requestId) ||
          !Number.isSafeInteger(body.version) ||
          Number(body.version) < 1
        )
          return json({ error: "Invalid request identifier or version." }, 400);
        // Cookies are shared across tabs; the rendered request must match the
        // capability being used, even when both records have the same version.
        if (body.requestId !== receipt.requestId)
          return json(
            {
              error:
                "Another request was opened in this browser. Refresh saved status and review it before cancelling.",
            },
            409,
          );
        payload.version = body.version;
      } else if (request.method !== "GET")
        return json({ error: "Method unavailable." }, 405);
      const { data, error } = await client.rpc("rhh_consultation_public", {
        action: request.method === "PATCH" ? "cancel" : "status",
        payload,
      });
      consultationError(error);
      return json({
        ...publicConsultationReceipt(data),
        requestId: receipt.requestId,
      });
    }
    const client = createRequestSupabaseClient({
      getAll: () => request.cookies.getAll(),
      setAll(cs, headers) {
        cs.forEach(({ name, value, options }) =>
          carrier.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => carrier.headers.set(k, v));
      },
    });
    if (!(await authenticatedIdentity(client)))
      return json({ error: "Sign in with a confirmed account." }, 401);
    if (scope === "preference") {
      if (request.nextUrl.search || !["GET", "PATCH"].includes(request.method))
        return json({ error: "Invalid preference operation." }, 400);
      const parsed =
        request.method === "PATCH"
          ? parseConsultationPreference(await readQaBody(request))
          : null;
      if (request.method === "PATCH" && !parsed)
        return json(
          {
            error:
              "Only a participation choice and saved profile version are allowed.",
          },
          400,
        );
      const { data, error } = await client.rpc(
        "rhh_member_consultation_preference",
        {
          payload: parsed ? { action: "save", ...parsed } : { action: "get" },
        },
      );
      if (error?.code === "40001")
        throw new ConsultationDataError(
          409,
          "Your saved profile changed. Your participation choice is retained. Compare the saved preference and reload its version before trying again.",
        );
      consultationError(error);
      const preference = parseConsultationPreference(data);
      if (!preference)
        throw new ConsultationDataError(
          503,
          "Saved participation is unavailable. Keep your choice.",
        );
      return json({ ...preference, ...(parsed ? { saved: true } : {}) });
    }
    if (request.method === "GET") {
      const params = request.nextUrl.searchParams;
      const page = parseInboxPage(params.get("page"));
      if (
        !page ||
        [...params.keys()].some((k) => k !== "page") ||
        params.getAll("page").length > 1
      )
        return json({ error: "Invalid page." }, 400);
      return json(await loadConsultations(client, scope === "admin", page));
    }
    if (request.method !== "POST" || request.nextUrl.search)
      return json({ error: "Invalid operation." }, 400);
    const parsed = parseConsultationAction(
      await readQaBody(request),
      scope === "admin",
    );
    if (!parsed)
      return json(
        { error: "Check the action, saved version and permitted fields." },
        400,
      );
    const { data, error } = await client.rpc("rhh_consultation_workspace", {
      admin_view: scope === "admin",
      ...parsed,
    });
    consultationError(error);
    return json(savedConsultation(data));
  } catch (e) {
    return e instanceof ConsultationDataError || e instanceof QaDataError
      ? json({ error: e.message }, e.status)
      : json(
          {
            error:
              "Consultations are unavailable. Your draft has not been cleared.",
          },
          503,
        );
  }
}
