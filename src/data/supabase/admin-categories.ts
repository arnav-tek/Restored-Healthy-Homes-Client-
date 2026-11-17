import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import {
  parseAdminCategories,
  type parseCategoryMutation,
} from "../../validation/admin-categories";
export class CategoryDataError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function adminCategories(
  client: SupabaseClient<AuthDatabase>,
  mutation?: NonNullable<ReturnType<typeof parseCategoryMutation>>,
) {
  const { data, error } = await client.rpc("rhh_admin_categories", {
    payload: mutation ? { ...mutation } : { action: "get" },
  });
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
    throw new CategoryDataError(
      status,
      status === 403
        ? "Current administrator access is required."
        : error.message === "duplicate_category"
          ? "That category name, ID or billing key already exists. Your draft is retained."
          : status === 409
            ? "The saved category catalog changed. Your draft is retained; compare and reload the saved version before retrying."
            : status === 400
              ? "Check the category name, configuration and reason. Your draft is retained."
              : "Categories are temporarily unavailable. Your draft is retained.",
    );
  }
  const projected = parseAdminCategories(data);
  if (!projected)
    throw new CategoryDataError(
      503,
      "Saved category data is unavailable. Your draft is retained.",
    );
  if (
    mutation &&
    (!data ||
      typeof data !== "object" ||
      !("saved" in data) ||
      data.saved !== true)
  )
    throw new CategoryDataError(
      503,
      "Saving could not be confirmed. Compare saved categories before retrying.",
    );
  return {
    ...projected,
    ...(mutation
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
