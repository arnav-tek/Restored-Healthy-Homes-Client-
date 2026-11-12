export const notificationStates = [
  "pending",
  "processing",
  "retry",
  "accepted",
  "failed",
  "unknown",
  "canceled",
  "test_recorded",
] as const;
export type NotificationState = (typeof notificationStates)[number];
export const notificationFailureCodes = [
  "",
  "rate_limited",
  "unavailable",
  "timeout",
  "network",
  "rejected",
  "invalid_recipient",
  "configuration",
  "unknown",
  "worker_abandoned",
  "recipient_unavailable",
  "configuration_changed",
  "idempotency_expired",
  "expired",
  "adapter_contract",
] as const;
export type NotificationFailureCode = (typeof notificationFailureCodes)[number];
export type NotificationClaim = { id: string; lease: string; attempt: number };
export type PreparedNotification = {
  id: string;
  inquiryId: string;
  to: string;
  from: string;
  origin: string;
  mode: "live" | "test";
  idempotencyKey: string;
};
export type NotificationOutcome =
  "accepted" | "test_recorded" | "temporary" | "permanent" | "ambiguous";
export type NotificationEvent = {
  event: string;
  attempt: number;
  code: NotificationFailureCode;
  at: string;
  reason: string;
};
export type NotificationJob = {
  id: string;
  inquiryId: string;
  state: NotificationState;
  attempts: number;
  manualRetries: number;
  version: number;
  nextAttemptAt: string;
  failureCode: NotificationFailureCode;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  events: NotificationEvent[];
};
export type NotificationJobs = {
  page: number;
  hasNext: boolean;
  jobs: NotificationJob[];
};
export const notificationStateLabels: Record<NotificationState, string> = {
  pending: "Pending configuration or dispatch",
  processing: "Processing",
  retry: "Waiting to retry",
  accepted: "Provider accepted; mailbox receipt unconfirmed",
  failed: "Failed",
  unknown: "Outcome unknown; reconcile before retrying",
  canceled: "Canceled",
  test_recorded: "Test recorded; no email sent",
};
