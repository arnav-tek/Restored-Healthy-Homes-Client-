import "server-only";
import type {
  NotificationClaim,
  NotificationFailureCode,
  NotificationOutcome,
  NotificationState,
  PreparedNotification,
} from "../../domain/inquiry-notification";

export type NotificationMessage = {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};
export type DeliveryFailure = {
  kind: "temporary" | "permanent" | "ambiguous";
  code: Exclude<NotificationFailureCode, "">;
  retryAfterSeconds?: number;
};
export type DeliveryResult =
  | DeliveryFailure
  | { kind: "accepted"; providerMessageId: string | null }
  | { kind: "test_recorded" };
/** Implementations classify only known non-acceptance as temporary/permanent.
 * A lost/timeout response is ambiguous. Providers must honor AbortSignal and
 * describe their real idempotency retention; zero means no guarantee.
 */
export interface NotificationAdapter {
  readonly name: string;
  readonly mode: "live" | "test";
  readonly idempotencySeconds: number;
  send(
    message: NotificationMessage,
    signal: AbortSignal,
  ): Promise<DeliveryResult>;
}
export interface NotificationQueue {
  claim(): Promise<NotificationClaim | null>;
  prepare(
    claim: NotificationClaim,
    adapter: NotificationAdapter,
    sender: string,
    origin: string,
  ): Promise<PreparedNotification | null>;
  finish(
    claim: NotificationClaim,
    outcome: NotificationOutcome,
    code: NotificationFailureCode,
    receipt: string | null,
    retryAfterSeconds: number,
  ): Promise<NotificationState>;
}
