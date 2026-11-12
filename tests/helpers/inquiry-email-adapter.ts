import type {
  DeliveryFailure,
  DeliveryResult,
  NotificationAdapter,
  NotificationMessage,
} from "../../src/data/notifications/contracts";
/** Isolated-test adapter. It never opens a network connection and cannot report
 * provider acceptance, sent mail or mailbox delivery.
 */
export class RecordingInquiryEmailAdapter implements NotificationAdapter {
  readonly name = "recording-test";
  readonly mode = "test" as const;
  readonly idempotencySeconds = 3600;
  readonly recorded: NotificationMessage[] = [];
  private readonly keys = new Set<string>();
  calls = 0;
  constructor(private readonly outcomes: (DeliveryFailure | "record")[] = []) {}
  async send(
    message: NotificationMessage,
    signal: AbortSignal,
  ): Promise<DeliveryResult> {
    this.calls++;
    if (signal.aborted) return { kind: "ambiguous", code: "timeout" };
    const outcome = this.outcomes.shift() ?? "record";
    if (outcome !== "record") return outcome;
    if (!this.keys.has(message.idempotencyKey)) {
      this.keys.add(message.idempotencyKey);
      this.recorded.push({ ...message });
    }
    return { kind: "test_recorded" };
  }
}
