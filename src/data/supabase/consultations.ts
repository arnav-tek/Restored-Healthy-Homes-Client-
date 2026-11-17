import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import { parseConsultationWorkspace } from "../../validation/connected-consultations";
import { isRecord } from "../../validation/member-account";
import { consultationStatuses } from "../../domain/consultation";
import type { ConsultationReceipt } from "../../domain/connected-consultations";
export class ConsultationDataError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function consultationError(error: { code?: string } | null) {
  if (!error) return;
  const status =
    (
      {
        PT404: 404,
        PT409: 409,
        "40001": 409,
        PT429: 429,
        "42501": 403,
        "22023": 400,
        "22P02": 400,
      } as Record<string, number>
    )[error.code ?? ""] ?? 503;
  throw new ConsultationDataError(
    status,
    status === 409
      ? "This request changed or the specialist is unavailable. Refresh saved status before retrying; your draft is retained."
      : status === 429
        ? "The request limit has been reached. Please try again later."
        : status === 403
          ? "This account cannot access this consultation."
          : status === 404
            ? "The saved request is unavailable or its receipt has expired."
            : "Consultations are unavailable. Saving has not been confirmed.",
  );
}
export async function loadConsultations(
  client: SupabaseClient<AuthDatabase>,
  admin: boolean,
  page = 1,
) {
  const { data, error } = await client.rpc("rhh_consultation_workspace", {
    admin_view: admin,
    action: "list",
    payload: { page },
  });
  consultationError(error);
  const result = parseConsultationWorkspace(data, admin);
  if (!result)
    throw new ConsultationDataError(
      503,
      "Consultations are temporarily unavailable.",
    );
  return result;
}
export function savedConsultation(data: unknown) {
  if (!isRecord(data) || data.saved !== true)
    throw new ConsultationDataError(
      503,
      "Saving could not be confirmed. Keep your draft.",
    );
  return { saved: true };
}
export function publicConsultationReceipt(
  data: unknown,
): Omit<ConsultationReceipt, "requestId"> {
  if (
    !isRecord(data) ||
    !consultationStatuses.includes(data.status as never) ||
    !Number.isSafeInteger(data.version) ||
    typeof data.categoryId !== "string"
  )
    throw new ConsultationDataError(503, "Saved status is unavailable.");
  return {
    status: data.status as ConsultationReceipt["status"],
    version: Number(data.version),
    categoryId: data.categoryId,
  };
}
