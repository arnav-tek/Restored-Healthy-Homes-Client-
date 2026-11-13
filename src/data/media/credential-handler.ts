import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "../../domain/config";
import { authenticatedIdentity } from "../supabase/auth";
import { authConfiguration } from "../supabase/auth-config";
import { createRequestSupabaseClient } from "../supabase/server";
import { readLimited, privateHeaders, imageResponse } from "./http";
import { ProfileMediaError } from "../supabase/profile-media";
import {
  CredentialDataError,
  memberCredentials,
  loadMemberCredentials,
  loadAdminCredentials,
  reviewCredential,
  evidenceRoute,
  cleanupCredentialDrafts,
} from "../supabase/credential-evidence";
import {
  credentialId,
  parseCredentialDecision,
  parseEvidenceAssociation,
  parseEvidenceRoute,
  parseMemberCredentials,
} from "../../validation/credential-review";
import { parseInboxPage } from "../../validation/connected-inquiry";
import { isRecord } from "../../validation/member-account";
import { credentialEvidenceStorage } from "./storage";
import { processProfileImage } from "./process-profile-image";
import {
  profileImageInputLimit,
  profileImageTypes,
} from "../../domain/profile-media";
export async function handleCredentials(request: NextRequest, admin = false) {
  const carrier = new NextResponse(null, { headers: privateHeaders() });
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
      return json({ error: "Sign in with a confirmed account." }, 401);
    if (request.method === "GET") {
      const file = request.nextUrl.searchParams.get("file");
      if (file) {
        if (request.nextUrl.searchParams.size !== 1 || !credentialId(file))
          return json({ error: "Evidence unavailable." }, 404);
        const route = await evidenceRoute(client, file, admin);
        if (!route) return json({ error: "Evidence unavailable." }, 404);
        const r = imageResponse(
          await credentialEvidenceStorage().download(route.objectPath),
          carrier.headers,
        );
        carrier.cookies.getAll().forEach((c) => r.cookies.set(c));
        return r;
      }
      if (admin) {
        const page = parseInboxPage(request.nextUrl.searchParams.get("page"));
        if (
          !page ||
          request.nextUrl.searchParams.size > 1 ||
          [...request.nextUrl.searchParams.keys()].some((k) => k !== "page")
        )
          return json({ error: "Choose a valid review page." }, 400);
        return json(await loadAdminCredentials(client, page));
      }
      if (request.nextUrl.search)
        return json({ error: "Unexpected credential parameters." }, 400);
      const cleanupPending = await cleanupCredentialDrafts(client);
      return json({ ...(await loadMemberCredentials(client)), cleanupPending });
    }
    if (!admin && request.method === "POST") {
      const claimId = request.nextUrl.searchParams.get("claim");
      if (request.nextUrl.searchParams.size !== 1 || !credentialId(claimId))
        return json({ error: "Choose a saved credential claim." }, 400);
      await loadMemberCredentials(client);
      const storage = credentialEvidenceStorage();
      const type = request.headers.get("content-type") ?? "";
      if (!profileImageTypes.some((t) => t === type))
        return json(
          {
            error:
              "Use a JPEG, PNG or WebP scan. PDF and other document formats are not supported.",
          },
          415,
        );
      if (
        Number(request.headers.get("content-length")) > profileImageInputLimit
      )
        return json({ error: "Use an image scan up to 5 MB." }, 413);
      await cleanupCredentialDrafts(client);
      const route = parseEvidenceRoute(
        await memberCredentials(client, { action: "reserve", claimId }),
      );
      if (!route)
        throw new CredentialDataError(
          503,
          "Evidence reservation could not be confirmed.",
        );
      try {
        const bytes = await readLimited(request, profileImageInputLimit);
        let processed: Uint8Array;
        try {
          processed = await processProfileImage(bytes, type);
        } catch {
          throw new CredentialDataError(
            400,
            "Choose a valid static JPEG, PNG or WebP scan up to 5 MB and 16 million pixels.",
          );
        }
        await storage.upload(route.objectPath, processed);
        return json({ draftId: route.id });
      } catch (error) {
        try {
          await memberCredentials(client, {
            action: "cancel",
            target: route.id,
          });
          await cleanupCredentialDrafts(client);
        } catch {
          /* retained for safe cleanup */
        }
        throw error;
      }
    }
    if (request.nextUrl.search)
      return json({ error: "Unexpected credential parameters." }, 400);
    if (
      (admin && request.method !== "POST") ||
      (!admin && !["PATCH", "DELETE"].includes(request.method))
    )
      return json({ error: "Method not allowed." }, 405);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return json({ error: "Use a JSON request." }, 415);
    let raw: unknown;
    try {
      raw = JSON.parse(
        new TextDecoder().decode(await readLimited(request, 4096)),
      );
    } catch (error) {
      if (error instanceof ProfileMediaError) throw error;
      return json({ error: "Check the credential request." }, 400);
    }
    if (admin) {
      const decision = parseCredentialDecision(raw);
      if (!decision)
        return json(
          {
            error:
              "Choose a valid claim version, evidence, decision and reason of 3–300 characters. Reviewer fields are not accepted.",
          },
          400,
        );
      return json(await reviewCredential(client, decision));
    }
    if (request.method === "PATCH") {
      const mutation = parseEvidenceAssociation(raw);
      if (!mutation)
        return json(
          {
            error:
              "Choose a valid saved claim, evidence and version. Review fields are not accepted.",
          },
          400,
        );
      const data = parseMemberCredentials(
        await memberCredentials(client, { action: "attach", ...mutation }),
      );
      if (!data)
        throw new CredentialDataError(
          503,
          "Save could not be confirmed. Reload saved evidence.",
        );
      const cleanupPending = await cleanupCredentialDrafts(client);
      return json({ ...data, saved: true, cleanupPending });
    }
    if (
      !isRecord(raw) ||
      Object.keys(raw).length !== 1 ||
      !credentialId(raw.target)
    )
      return json({ error: "Choose an unattached draft to discard." }, 400);
    const data = parseMemberCredentials(
      await memberCredentials(client, { action: "cancel", target: raw.target }),
    );
    if (!data)
      throw new CredentialDataError(503, "Discard could not be confirmed.");
    const cleanupPending = await cleanupCredentialDrafts(client);
    return json({ ...data, cleanupPending });
  } catch (error) {
    return error instanceof CredentialDataError ||
      error instanceof ProfileMediaError
      ? json({ error: error.message }, error.status)
      : json(
          {
            error:
              "Credential operation could not be confirmed. Your draft is retained; reload saved state before retrying.",
          },
          503,
        );
  }
}
