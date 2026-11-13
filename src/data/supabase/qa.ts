import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import type { QaRepository } from "../contracts";
import type {
  QuestionSubmission,
  AnswerSubmission,
} from "../../domain/connected-qa";
import { searchPublicQuestions } from "../../domain/qa";
import { inquiryUuid } from "../../validation/connected-inquiry";
import { parsePublicQa, parseMemberQa } from "../../validation/connected-qa";
import { isRecord } from "../../validation/member-account";
import { createPublicSupabaseClient } from "./public-directory";
export class QaDataError extends Error {
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
  throw new QaDataError(
    status,
    status === 409
      ? "This record changed or has already been reviewed. Your draft is retained; reload saved answers before retrying."
      : status === 429
        ? "The submission limit has been reached. Please try again later."
        : status === 403
          ? "Answering requires a confirmed member account, approval, active membership and no suspension."
          : status === 404
            ? "This question is not available in your categories."
            : "Q&A is temporarily unavailable. Your draft has not been cleared.",
  );
}
export const loadPublicQa = cache(async (target: string | null = null) => {
  const { data, error } = await createPublicSupabaseClient().rpc(
    "rhh_public_qa",
    { target },
  );
  check(error);
  const projected = parsePublicQa(data);
  if (!projected)
    throw new QaDataError(503, "Questions are temporarily unavailable.");
  return projected;
});
export const connectedQa: QaRepository = {
  async listPublic() {
    return (await loadPublicQa()).questions;
  },
  async search(query) {
    const data = await loadPublicQa();
    return searchPublicQuestions(data.questions, query, data.catalog);
  },
  async getPublicQuestion(id) {
    if (!inquiryUuid.test(id)) return null;
    return (await loadPublicQa(id)).questions[0] ?? null;
  },
};
export async function memberQa(
  client: SupabaseClient<AuthDatabase>,
  target: string | null,
  page = 1,
) {
  const { data, error } = await client.rpc("rhh_member_qa", {
    target,
    page_number: page,
  });
  check(error);
  const projected = parseMemberQa(data);
  if (!projected)
    throw new QaDataError(
      503,
      "Your category inbox is temporarily unavailable.",
    );
  return projected;
}
export async function submitQuestion(payload: QuestionSubmission) {
  const { data, error } = await createPublicSupabaseClient().rpc(
    "rhh_submit_question",
    { payload },
  );
  check(error);
  if (!isRecord(data) || data.saved !== true || data.status !== "pending")
    throw new QaDataError(
      503,
      "Saving could not be confirmed. Keep your draft and retry.",
    );
  return { saved: true, status: "pending" };
}
export async function submitAnswer(
  client: SupabaseClient<AuthDatabase>,
  payload: AnswerSubmission,
) {
  const { data, error } = await client.rpc("rhh_submit_answer", { payload });
  check(error);
  if (
    !isRecord(data) ||
    data.saved !== true ||
    !["pending", "published", "hidden", "rejected"].includes(
      String(data.status),
    ) ||
    !Number.isSafeInteger(data.version)
  )
    throw new QaDataError(
      503,
      "Saving could not be confirmed. Keep your draft and reload saved answers.",
    );
  return {
    saved: true,
    status: String(data.status),
    version: Number(data.version),
  };
}
