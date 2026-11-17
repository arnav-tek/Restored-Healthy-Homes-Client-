import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import {
  parseOperationsInput,
  projectFeatured,
  projectOperationsReport,
} from "../../validation/admin-operations";
export class OperationsDataError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function adminOperations(
  client: SupabaseClient<AuthDatabase>,
  payload: NonNullable<ReturnType<typeof parseOperationsInput>>,
) {
  const { data, error } = await client.rpc("rhh_admin_operations", {
    payload: { ...payload },
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
    throw new OperationsDataError(
      status,
      status === 403
        ? "Current administrator access is required."
        : error.message === "listing_not_eligible"
          ? "This listing is no longer eligible. Reload and compare; your draft is retained."
          : status === 409
            ? "The saved selection changed. Your draft is retained; reload and compare before retrying."
            : status === 400
              ? "Check the fields, saved version and reason. Your draft is retained."
              : "Operations data is temporarily unavailable. Your draft is retained.",
    );
  }
  const result =
    payload.action === "report"
      ? projectOperationsReport(data)
      : projectFeatured(data);
  if (!result)
    throw new OperationsDataError(
      503,
      "Saved operations data could not be validated. Your draft is retained.",
    );
  if (payload.action !== "set_featured") return result;
  if (
    !data ||
    typeof data !== "object" ||
    !("saved" in data) ||
    data.saved !== true
  )
    throw new OperationsDataError(
      503,
      "Saving could not be confirmed. Reload saved selections before retrying.",
    );
  return {
    ...result,
    saved: true as const,
    ...("unchanged" in data && data.unchanged === true
      ? { unchanged: true as const }
      : {}),
  };
}
