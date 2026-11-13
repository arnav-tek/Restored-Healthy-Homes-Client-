import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import type { QaAdminFilters, QaDecisionInput } from "../../domain/qa-admin";
import { parseAdminQa, qaStatus } from "../../validation/qa-admin";
import { isRecord } from "../../validation/member-account";
export class QaAdminError extends Error {
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
      { PT404: 404, PT409: 409, "42501": 403, "22023": 400 } as Record<
        string,
        number
      >
    )[error.code ?? ""] ?? 503;
  throw new QaAdminError(
    status,
    status === 409
      ? "The question, answer or review changed, or this transition is blocked by publication order or current eligibility. Your draft is retained; compare the latest record before retrying."
      : status === 403
        ? "Current administrator access is required."
        : status === 404
          ? "This Q&A record is unavailable."
          : "Moderation could not be confirmed. Keep your draft and reload saved state.",
  );
}
export async function loadAdminQa(
  client: SupabaseClient<AuthDatabase>,
  filters: QaAdminFilters,
) {
  const { data, error } = await client.rpc("rhh_admin_qa", { filters });
  check(error);
  const parsed = parseAdminQa(data);
  if (!parsed)
    throw new QaAdminError(503, "The moderation queue could not be loaded.");
  return parsed;
}
export async function moderateQa(
  client: SupabaseClient<AuthDatabase>,
  payload: QaDecisionInput,
) {
  const { data, error } = await client.rpc("rhh_moderate_qa", { payload });
  check(error);
  if (
    !isRecord(data) ||
    data.saved !== true ||
    !qaStatus(data.status) ||
    !Number.isSafeInteger(data.version)
  )
    throw new QaAdminError(
      503,
      "Decision could not be confirmed. Compare saved history before retrying.",
    );
  return { saved: true, status: data.status, version: Number(data.version) };
}
