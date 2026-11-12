import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import type {
  InboxDetail,
  InboxItem,
  InboxPage,
  InquirySubmission,
} from "../../domain/inbox";
import { isRecord } from "../../validation/member-account";
import { inquiryUuid } from "../../validation/connected-inquiry";

export class InboxError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(): never {
  throw new InboxError(
    503,
    "The inbox is temporarily unavailable. Please try again.",
  );
}
const timestamp = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
function item(value: unknown): InboxItem {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !inquiryUuid.test(value.id) ||
    typeof value.name !== "string" ||
    !timestamp(value.createdAt) ||
    !(value.readAt === null || timestamp(value.readAt))
  )
    return fail();
  return {
    id: value.id,
    name: value.name,
    createdAt: value.createdAt,
    readAt: value.readAt,
  };
}
export function projectInboxPage(value: unknown): InboxPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    value.items.length > 20 ||
    !Number.isSafeInteger(value.page) ||
    Number(value.page) < 1 ||
    typeof value.hasNext !== "boolean"
  )
    return fail();
  return {
    items: value.items.map(item),
    page: Number(value.page),
    hasNext: value.hasNext,
  };
}
export function projectInboxDetail(value: unknown): InboxDetail | null {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    typeof value.professionalId !== "string" ||
    !inquiryUuid.test(value.professionalId) ||
    typeof value.email !== "string" ||
    typeof value.message !== "string" ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1
  )
    return fail();
  return {
    ...item(value),
    professionalId: value.professionalId,
    email: value.email,
    message: value.message,
    version: Number(value.version),
  };
}
function check(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "PT404" || error.code === "P0002")
    throw new InboxError(404, "This inquiry is unavailable.");
  if (
    (error.code === "PT429" || error.code === "P0001") &&
    error.message === "inquiry_rate_limited"
  )
    throw new InboxError(
      429,
      "Inquiries are temporarily limited. Please try again later. Your draft has been kept.",
    );
  if (error.code === "22023")
    throw new InboxError(400, "Check the inquiry fields and try again.");
  if (error.code === "PT409" || error.code === "40001")
    throw new InboxError(
      409,
      "This inquiry changed in another session. Reload it before updating its read state.",
    );
  if (error.code === "42501")
    throw new InboxError(
      403,
      "A confirmed member account is required to open this inbox.",
    );
  return fail();
}
type Client = SupabaseClient<AuthDatabase>;
export async function submitInquiry(
  client: Client,
  payload: InquirySubmission,
) {
  const { data, error } = await client.rpc("rhh_submit_inquiry", { payload });
  // Submission is public: an infrastructure permission failure must not suggest
  // that the visitor needs a member account.
  if (error?.code === "42501") return fail();
  check(error);
  if (!isRecord(data) || data.saved !== true) return fail();
  return { saved: true as const };
}
export async function loadInbox(client: Client, page: number) {
  const { data, error } = await client.rpc("rhh_inbox", { page_number: page });
  check(error);
  return projectInboxPage(data);
}
export async function loadInquiry(client: Client, id: string) {
  const { data, error } = await client.rpc("rhh_read_inquiry", { target: id });
  check(error);
  return projectInboxDetail(data);
}
export async function setInquiryRead(
  client: Client,
  id: string,
  read: boolean,
  version: number,
) {
  const { data, error } = await client.rpc("rhh_set_inquiry_read", {
    target: id,
    is_read: read,
    expected_version: version,
  });
  check(error);
  const result = projectInboxDetail(data);
  if (!result) throw new InboxError(404, "This inquiry is unavailable.");
  return result;
}
