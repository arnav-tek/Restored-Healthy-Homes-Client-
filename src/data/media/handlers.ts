import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "../../domain/config";
import { authenticatedIdentity } from "../supabase/auth";
import { authConfiguration } from "../supabase/auth-config";
import { createRequestSupabaseClient } from "../supabase/server";
import { readLimited, privateHeaders, imageResponse } from "./http";
import {
  memberMedia,
  mediaSnapshot,
  cleanupProfileMedia,
  publicMediaClient,
  ProfileMediaError,
} from "../supabase/profile-media";
import {
  parseMediaRoute,
  parseMediaSave,
  parseMediaState,
} from "../../validation/profile-media";
import { isRecord } from "../../validation/member-account";
import {
  mediaUuid,
  profileImageInputLimit,
  profileImageTypes,
} from "../../domain/profile-media";
import { profileImageStorage } from "./storage";
import { processProfileImage } from "./process-profile-image";
export async function handleMemberMedia(request: NextRequest) {
  const carrier = new NextResponse(null, { headers: privateHeaders() });
  const response = (body: unknown, status = 200) => {
    const r = NextResponse.json(body, { status, headers: carrier.headers });
    carrier.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };
  if (applicationMode(process.env) !== "staging")
    return response({ error: "Not available in demo mode." }, 404);
  if (
    request.method !== "GET" &&
    (request.headers.get("origin") !== authConfiguration().origin ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    return response({ error: "This request is not allowed." }, 403);
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
      return response(
        { error: "Sign in with a confirmed email address." },
        401,
      );
    if (request.method === "GET") {
      if (request.nextUrl.search) {
        const id = request.nextUrl.searchParams.get("image");
        if (
          request.nextUrl.searchParams.size !== 1 ||
          !id ||
          !mediaUuid.test(id)
        )
          return response({ error: "Image unavailable." }, 404);
        const route = parseMediaRoute(await memberMedia(client, "route", id));
        if (!route) return response({ error: "Image unavailable." }, 404);
        const image = imageResponse(
          await profileImageStorage().download(route.objectPath),
          carrier.headers,
        );
        carrier.cookies.getAll().forEach((cookie) => image.cookies.set(cookie));
        return image;
      }
      const cleanupPending = await cleanupProfileMedia(client);
      return response({ ...(await mediaSnapshot(client)), cleanupPending });
    }
    if (request.nextUrl.search)
      return response({ error: "Unexpected image request parameters." }, 400);
    if (request.method === "POST") {
      await mediaSnapshot(client); // Role, current session and owned listing before privileged byte access.
      const storage = profileImageStorage();
      const type = request.headers.get("content-type") ?? "";
      if (!profileImageTypes.some((t) => t === type))
        return response({ error: "Choose a JPEG, PNG or WebP image." }, 415);
      if (
        Number(request.headers.get("content-length")) > profileImageInputLimit
      )
        return response({ error: "Choose an image up to 5 MB." }, 413);
      await cleanupProfileMedia(client);
      const route = parseMediaRoute(await memberMedia(client, "reserve"));
      if (!route)
        throw new ProfileMediaError(503, "Image reservation unavailable.");
      try {
        const bytes = await readLimited(request, profileImageInputLimit);
        let processed: Uint8Array;
        try {
          processed = await processProfileImage(bytes, type);
        } catch {
          throw new ProfileMediaError(
            400,
            "Choose a valid, static JPEG, PNG or WebP image up to 5 MB and 16 million pixels.",
          );
        }
        await storage.upload(route.objectPath, processed);
        return response({ draftId: route.id });
      } catch (error) {
        // A timeout may have stored bytes. Retain the reservation, marked for cleanup,
        // until deletion is confirmed. Never touch the current saved image.
        try {
          await memberMedia(client, "cancel", route.id);
          await cleanupProfileMedia(client);
        } catch {
          /* durable reservation remains */
        }
        throw error;
      }
    }
    if (!["PATCH", "DELETE"].includes(request.method))
      return response({ error: "Method not allowed." }, 405);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return response({ error: "Use a JSON request." }, 415);
    let body: unknown;
    try {
      body = JSON.parse(
        new TextDecoder().decode(await readLimited(request, 2048)),
      );
    } catch (error) {
      if (error instanceof ProfileMediaError) throw error;
      return response({ error: "Check the image request." }, 400);
    }
    if (request.method === "PATCH") {
      const input = parseMediaSave(body);
      if (!input)
        return response(
          { error: "Check the saved version, image and publication choice." },
          400,
        );
      const data = parseMediaState(
        await memberMedia(
          client,
          "save",
          input.target,
          input.version,
          input.published,
        ),
      );
      if (!data)
        throw new ProfileMediaError(
          503,
          "Saved image status could not be confirmed. Reload before retrying.",
        );
      const cleanupPending = await cleanupProfileMedia(client);
      // Save acknowledgement never depends on subsequent byte cleanup.
      return response({ ...data, cleanupPending, saved: true });
    }
    if (
      !isRecord(body) ||
      Object.keys(body).length !== 1 ||
      typeof body.target !== "string" ||
      !mediaUuid.test(body.target)
    )
      return response({ error: "Choose a draft image to discard." }, 400);
    await memberMedia(client, "cancel", body.target);
    const cleanupPending = await cleanupProfileMedia(client);
    return response({ ...(await mediaSnapshot(client)), cleanupPending });
  } catch (error) {
    return error instanceof ProfileMediaError
      ? response({ error: error.message }, error.status)
      : response(
          {
            error:
              "Image operation could not be confirmed. Your draft is retained; reload saved image status before retrying.",
          },
          503,
        );
  }
}
export async function handlePublicProfileImage(
  professionalId: string,
  photoId: string,
) {
  const headers = privateHeaders();
  const unavailable = () => new NextResponse(null, { status: 404, headers });
  if (
    applicationMode(process.env) !== "staging" ||
    !mediaUuid.test(professionalId) ||
    !mediaUuid.test(photoId)
  )
    return unavailable();
  try {
    const { data, error } = await publicMediaClient().rpc(
      "rhh_public_profile_media",
      { target_id: professionalId, media_id: photoId },
    );
    const route = error ? null : parseMediaRoute(data);
    if (!route) return unavailable();
    return imageResponse(
      await profileImageStorage().download(route.objectPath),
      headers,
    );
  } catch {
    return unavailable();
  }
}
