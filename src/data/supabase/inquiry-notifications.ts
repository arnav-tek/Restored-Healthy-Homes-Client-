import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { applicationMode, stagingConfiguration } from "../../domain/config";
import {
  notificationStates,
  type NotificationClaim,
  type NotificationJobs,
  type PreparedNotification,
} from "../../domain/inquiry-notification";
import { parseNotificationJobs } from "../../validation/inquiry-notifications";
import { inquiryUuid } from "../../validation/connected-inquiry";
import { isRecord } from "../../validation/member-account";
import type { AuthDatabase } from "./database.types";
import type { NotificationQueue } from "../notifications/contracts";
import { validNotificationWorkerToken } from "../notifications/config";

export class NotificationOperationError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
function unavailable(): never {
  throw new NotificationOperationError(
    503,
    "Notification operations are temporarily unavailable.",
  );
}
function check(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "42501")
    throw new NotificationOperationError(
      403,
      "Administrator access is required.",
    );
  if (error.code === "PT404")
    throw new NotificationOperationError(
      404,
      "This notification job is unavailable.",
    );
  if (error.code === "PT409")
    throw new NotificationOperationError(
      409,
      "This job changed or cannot be retried safely. Reload the latest status.",
    );
  if (error.code === "22023")
    throw new NotificationOperationError(
      400,
      "Check the notification operation and try again.",
    );
  unavailable();
}
const uuid = (value: unknown): value is string =>
  typeof value === "string" && inquiryUuid.test(value);
export function projectNotificationJobs(raw: unknown): NotificationJobs {
  const result = parseNotificationJobs(raw);
  return result ?? unavailable();
}

type Client = SupabaseClient<AuthDatabase>;
export async function loadNotificationJobs(client: Client, page: number) {
  const { data, error } = await client.rpc("rhh_admin_inquiry_email_jobs", {
    page_number: page,
  });
  check(error);
  return projectNotificationJobs(data);
}
export async function retryNotificationJob(
  client: Client,
  id: string,
  version: number,
  reason: string,
) {
  const { data, error } = await client.rpc("rhh_retry_inquiry_email", {
    target: id,
    expected_version: version,
    reason,
  });
  check(error);
  if (!isRecord(data) || data.queued !== true) return unavailable();
  return { queued: true as const };
}
/** A scoped server worker capability, not a service-role client or member client. */
export function createNotificationQueue(): NotificationQueue {
  if (applicationMode(process.env) !== "staging")
    throw new Error("Notification workers require staging mode.");
  const token = process.env.RHH_INQUIRY_WORKER_SECRET;
  if (!validNotificationWorkerToken(token))
    throw new Error("Configure the server notification worker credential.");
  const { url, key } = stagingConfiguration(process.env);
  const client = createClient<AuthDatabase>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-rhh-notification-worker": token },
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          redirect: "error",
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)])
            : AbortSignal.timeout(10_000),
        }),
    },
  });
  return {
    async claim() {
      const { data, error } = await client.rpc("rhh_claim_inquiry_email");
      check(error);
      if (data === null) return null;
      if (
        !isRecord(data) ||
        !uuid(data.id) ||
        !uuid(data.lease) ||
        !Number.isSafeInteger(data.attempt) ||
        Number(data.attempt) < 1
      )
        return unavailable();
      const claim: NotificationClaim = {
        id: data.id,
        lease: data.lease,
        attempt: Number(data.attempt),
      };
      return claim;
    },
    async prepare(claim, adapter, sender, origin) {
      const { data, error } = await client.rpc("rhh_prepare_inquiry_email", {
        target: claim.id,
        claim_token: claim.lease,
        provider: adapter.name,
        sender,
        origin,
        mode: adapter.mode,
        idempotency_seconds: adapter.idempotencySeconds,
      });
      check(error);
      if (data === null) return null;
      if (
        !isRecord(data) ||
        data.id !== claim.id ||
        !uuid(data.inquiryId) ||
        typeof data.to !== "string" ||
        typeof data.from !== "string" ||
        typeof data.origin !== "string" ||
        data.mode !== adapter.mode ||
        typeof data.idempotencyKey !== "string"
      )
        return unavailable();
      const prepared: PreparedNotification = {
        id: claim.id,
        inquiryId: data.inquiryId,
        to: data.to,
        from: data.from,
        origin: data.origin,
        mode: adapter.mode,
        idempotencyKey: data.idempotencyKey,
      };
      return prepared;
    },
    async finish(claim, outcome, code, receipt, retryAfterSeconds) {
      const { data, error } = await client.rpc("rhh_finish_inquiry_email", {
        target: claim.id,
        claim_token: claim.lease,
        outcome,
        code,
        receipt,
        retry_after_seconds: retryAfterSeconds,
      });
      check(error);
      if (!isRecord(data)) return unavailable();
      const state = notificationStates.find((x) => x === data.state);
      if (!state) return unavailable();
      return state;
    },
  };
}
