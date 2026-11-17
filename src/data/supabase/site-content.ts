import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import { createPublicSupabaseClient } from "./public-directory";
import {
  projectContentWorkspace,
  projectPublishedContent,
} from "../../validation/site-content";
import type { ContentKind } from "../../domain/site-content";
export class ContentDataError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function adminContent(
  client: SupabaseClient<AuthDatabase>,
  payload: Record<string, unknown> = { action: "get", page: 1 },
) {
  const { data, error } = await client.rpc("rhh_admin_content", { payload });
  if (error) {
    const status =
      error.code === "42501"
        ? 403
        : error.code === "PT409"
          ? 409
          : error.code === "22023"
            ? 400
            : error.code === "PT404"
              ? 404
              : 503;
    throw new ContentDataError(
      status,
      status === 403
        ? "Current administrator access is required."
        : error.message === "duplicate_content_key"
          ? "This slug or page already exists. Your draft is retained."
          : status === 409
            ? "This content changed. Your draft is retained; reload and compare before retrying."
            : status === 400
              ? "Check the fields, approved links, complete copy and publication confirmation. Your draft is retained."
              : "Content is temporarily unavailable. Your draft is retained.",
    );
  }
  const state = projectContentWorkspace(data);
  if (!state)
    throw new ContentDataError(
      503,
      "Saved content could not be validated. Your draft is retained.",
    );
  if (
    payload.action !== "get" &&
    (!data ||
      typeof data !== "object" ||
      !("saved" in data) ||
      data.saved !== true)
  )
    throw new ContentDataError(
      503,
      "Saving could not be confirmed. Reload saved content before retrying.",
    );
  return {
    ...state,
    ...(payload.action !== "get"
      ? {
          saved: true as const,
          ...(data &&
          typeof data === "object" &&
          "unchanged" in data &&
          data.unchanged === true
            ? { unchanged: true as const }
            : {}),
        }
      : {}),
  };
}
export const publicContent = cache(
  async (kind: ContentKind, key?: string, page = 1, category?: string) => {
    const { data, error } = await createPublicSupabaseClient().rpc(
      "rhh_public_content",
      {
        kind_name: kind,
        ...(key ? { content_key: key } : {}),
        page_number: page,
        ...(category ? { category_filter: category } : {}),
      },
    );
    if (
      error ||
      !data ||
      typeof data !== "object" ||
      !("items" in data) ||
      !Array.isArray(data.items) ||
      !("total" in data) ||
      !Number.isSafeInteger(data.total)
    )
      throw new ContentDataError(
        503,
        "Published content is temporarily unavailable.",
      );
    const items = data.items.map(projectPublishedContent);
    if (items.some((i) => !i || i.kind !== kind || (key && i.key !== key)))
      throw new ContentDataError(
        503,
        "Published content is temporarily unavailable.",
      );
    return {
      items: items.filter((i) => i !== null),
      total: Number(data.total),
      page,
    };
  },
);
