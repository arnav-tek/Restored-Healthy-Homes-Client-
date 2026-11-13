import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import { stagingConfiguration } from "../../domain/config";
import {
  parseMediaRoute,
  parseMediaState,
} from "../../validation/profile-media";
import { profileImageStorage } from "../media/storage";
export class ProfileMediaError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function memberMedia(
  client: SupabaseClient<AuthDatabase>,
  action: string,
  target: string | null = null,
  version: number | null = null,
  publish = false,
) {
  const { data, error } = await client.rpc("rhh_member_media", {
    action,
    target,
    expected_version: version,
    publish,
  });
  if (error) {
    const status =
      (
        {
          PT404: 404,
          PT409: 409,
          PT429: 429,
          "42501": 403,
          "22023": 400,
        } as Record<string, number>
      )[error.code] ?? 503;
    throw new ProfileMediaError(
      status,
      status === 409
        ? "The saved image changed or the upload is incomplete. Your draft is retained; reload saved image status before trying again."
        : status === 429
          ? "Image quota reached. Discard unused drafts or retry tomorrow."
          : status === 403
            ? "Member image access is not permitted."
            : "Profile image operation is unavailable. Your saved image is unchanged.",
    );
  }
  return data;
}
export async function mediaSnapshot(client: SupabaseClient<AuthDatabase>) {
  const s = parseMediaState(await memberMedia(client, "get"));
  if (!s) throw new ProfileMediaError(503, "Image status unavailable.");
  return s;
}
/** Durable cleanup rows survive interruption. Only owner-authorized, detached paths are removed. */
export async function cleanupProfileMedia(
  client: SupabaseClient<AuthDatabase>,
) {
  let pending = false;
  try {
    const rows = await memberMedia(client, "cleanup");
    if (!Array.isArray(rows)) return true;
    for (const value of rows) {
      const route = parseMediaRoute(value);
      if (!route) {
        pending = true;
        continue;
      }
      try {
        await profileImageStorage().remove(route.objectPath);
        await memberMedia(client, "ack", route.id);
      } catch {
        pending = true;
      }
    }
  } catch {
    pending = true;
  }
  return pending;
}
export function publicMediaClient() {
  const { url, key } = stagingConfiguration(process.env);
  return createClient<AuthDatabase>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        }),
    },
  });
}
