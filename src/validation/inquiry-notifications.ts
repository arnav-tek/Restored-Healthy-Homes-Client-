import {
  notificationStates,
  notificationFailureCodes,
  type NotificationJobs,
  type NotificationJob,
  type NotificationEvent,
} from "../domain/inquiry-notification";
import { isRecord } from "./member-account";
import { inquiryUuid } from "./connected-inquiry";
const events = [
  "claimed",
  "accepted",
  "temporary",
  "permanent",
  "ambiguous",
  "recovered",
  "canceled",
  "manual_retry",
  "test_recorded",
];
const timestamp = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const uuid = (value: unknown): value is string =>
  typeof value === "string" && inquiryUuid.test(value);
export function parseNotificationJobs(raw: unknown): NotificationJobs | null {
  if (
    !isRecord(raw) ||
    !Array.isArray(raw.jobs) ||
    raw.jobs.length > 20 ||
    !Number.isSafeInteger(raw.page) ||
    Number(raw.page) < 1 ||
    typeof raw.hasNext !== "boolean"
  )
    return null;
  const jobs: NotificationJob[] = [];
  for (const j of raw.jobs) {
    if (
      !isRecord(j) ||
      !uuid(j.id) ||
      !uuid(j.inquiryId) ||
      !Number.isSafeInteger(j.attempts) ||
      Number(j.attempts) < 0 ||
      Number(j.attempts) > 7 ||
      !Number.isSafeInteger(j.manualRetries) ||
      Number(j.manualRetries) < 0 ||
      Number(j.manualRetries) > 2 ||
      !Number.isSafeInteger(j.version) ||
      Number(j.version) < 1 ||
      !timestamp(j.createdAt) ||
      !timestamp(j.updatedAt) ||
      !timestamp(j.nextAttemptAt) ||
      !(j.acceptedAt === null || timestamp(j.acceptedAt)) ||
      !Array.isArray(j.events) ||
      j.events.length > 10
    )
      return null;
    const state = notificationStates.find((x) => x === j.state);
    const failureCode = notificationFailureCodes.find(
      (x) => x === j.failureCode,
    );
    if (!state || failureCode === undefined) return null;
    const history: NotificationEvent[] = [];
    for (const e of j.events) {
      if (
        !isRecord(e) ||
        typeof e.event !== "string" ||
        !events.includes(e.event) ||
        !Number.isSafeInteger(e.attempt) ||
        !timestamp(e.at) ||
        typeof e.reason !== "string" ||
        e.reason.length > 300
      )
        return null;
      const code = notificationFailureCodes.find((x) => x === e.code);
      if (code === undefined) return null;
      history.push({
        event: e.event,
        attempt: Number(e.attempt),
        code,
        at: e.at,
        reason: e.reason,
      });
    }
    jobs.push({
      id: j.id,
      inquiryId: j.inquiryId,
      state,
      failureCode,
      attempts: Number(j.attempts),
      manualRetries: Number(j.manualRetries),
      version: Number(j.version),
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
      nextAttemptAt: j.nextAttemptAt,
      acceptedAt: j.acceptedAt,
      events: history,
    });
  }
  return { page: Number(raw.page), hasNext: raw.hasNext, jobs };
}
