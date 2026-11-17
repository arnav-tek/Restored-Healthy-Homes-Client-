import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import type {
  ReviewSubmission,
  ReviewDecisionInput,
  ReviewFilters,
} from "../../domain/connected-reviews";
import {
  parseAdminReviews,
  parseMemberReviews,
} from "../../validation/connected-reviews";
import { qaStatus } from "../../validation/qa-admin";
import { isRecord } from "../../validation/member-account";
import { createPublicSupabaseClient } from "./public-directory";
export class ReviewDataError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function check(error: { code?: string } | null) {
  if (!error) return;
  const status =
    (
      {
        PT404: 404,
        PT409: 409,
        PT429: 429,
        "42501": 403,
        "22023": 400,
      } as Record<string, number>
    )[error.code ?? ""] ?? 503;
  throw new ReviewDataError(
    status,
    status === 409
      ? "This review changed or the transition is unavailable. Your draft is retained; compare saved state before retrying."
      : status === 429
        ? "The review submission limit has been reached. Please try again later."
        : status === 403
          ? "Review access is not permitted for this account."
          : status === 404
            ? "The review or public listing is unavailable."
            : "Review operations are unavailable. Saving has not been confirmed; keep your draft.",
  );
}
export async function submitConnectedReview(
  target: string,
  payload: ReviewSubmission,
) {
  const { data, error } = await createPublicSupabaseClient().rpc(
    "rhh_submit_review",
    { target, payload },
  );
  check(error);
  if (!isRecord(data) || data.saved !== true)
    throw new ReviewDataError(
      503,
      "Save could not be confirmed. Keep your draft and retry.",
    );
  return { saved: true };
}
export async function loadMemberReviews(client: SupabaseClient<AuthDatabase>) {
  const { data, error } = await client.rpc("rhh_member_reviews");
  check(error);
  const p = parseMemberReviews(data);
  if (!p)
    throw new ReviewDataError(503, "Your published reviews are unavailable.");
  return p;
}
export async function loadAdminReviews(
  client: SupabaseClient<AuthDatabase>,
  filters: ReviewFilters,
) {
  const { data, error } = await client.rpc("rhh_admin_reviews", { filters });
  check(error);
  const p = parseAdminReviews(data);
  if (!p) throw new ReviewDataError(503, "The review queue is unavailable.");
  return p;
}
export async function moderateConnectedReview(
  client: SupabaseClient<AuthDatabase>,
  payload: ReviewDecisionInput,
) {
  const { data, error } = await client.rpc("rhh_moderate_review", { payload });
  check(error);
  if (
    !isRecord(data) ||
    data.saved !== true ||
    !qaStatus(data.status) ||
    !Number.isSafeInteger(data.version)
  )
    throw new ReviewDataError(
      503,
      "Decision could not be confirmed. Reload history before retrying.",
    );
  return {
    saved: true,
    status: data.status,
    version: Number(data.version),
    ...(data.unchanged === true ? { unchanged: true } : {}),
  };
}
