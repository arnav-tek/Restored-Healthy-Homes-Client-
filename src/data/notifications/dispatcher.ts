import "server-only";
import type {
  NotificationAdapter,
  NotificationQueue,
  DeliveryResult,
} from "./contracts";
import { inquiryNotificationMessage } from "./template";
import { notificationFailureCodes } from "../../domain/inquiry-notification";
import { isRecord } from "../../validation/member-account";

const deadlineMilliseconds = 15_000;
function sanitizedResult(
  result: unknown,
  mode: NotificationAdapter["mode"],
): DeliveryResult {
  if (!isRecord(result)) return { kind: "ambiguous", code: "unknown" };
  if (
    (result.kind === "accepted" && mode !== "live") ||
    (result.kind === "test_recorded" && mode !== "test")
  )
    return { kind: "permanent", code: "adapter_contract" };
  if (result.kind === "accepted") {
    if (
      result.providerMessageId !== null &&
      (typeof result.providerMessageId !== "string" ||
        !result.providerMessageId ||
        result.providerMessageId.length > 200 ||
        /[\x00-\x1f\x7f]/.test(result.providerMessageId))
    )
      return { kind: "ambiguous", code: "unknown" };
    return {
      kind: "accepted",
      providerMessageId: result.providerMessageId as string | null,
    };
  }
  if (result.kind === "test_recorded") return { kind: "test_recorded" };
  if (
    result.kind !== "temporary" &&
    result.kind !== "permanent" &&
    result.kind !== "ambiguous"
  )
    return { kind: "ambiguous", code: "unknown" };
  const code = notificationFailureCodes.find((value) => value === result.code);
  if (!code) return { kind: "ambiguous", code: "unknown" };
  return {
    kind: result.kind,
    code,
    retryAfterSeconds:
      typeof result.retryAfterSeconds === "number" &&
      Number.isFinite(result.retryAfterSeconds)
        ? Math.min(86400, Math.max(0, Math.ceil(result.retryAfterSeconds)))
        : 0,
  };
}
/** One atomic lease per job, then a bounded provider call. No fire-and-forget work. */
export async function dispatchInquiryNotifications(
  queue: NotificationQueue,
  adapter: NotificationAdapter,
  configuration: { sender: string; origin: string },
  timeoutMilliseconds = deadlineMilliseconds,
) {
  const counts = {
    accepted: 0,
    testRecorded: 0,
    retry: 0,
    failed: 0,
    unknown: 0,
    canceled: 0,
    notSent: 0,
    interrupted: 0,
  };
  const started = Date.now();
  for (let index = 0; index < 3 && Date.now() - started < 35_000; index++) {
    const claim = await queue.claim();
    if (!claim) break;
    const prepared = await queue.prepare(
      claim,
      adapter,
      configuration.sender,
      configuration.origin,
    );
    if (!prepared) {
      counts.notSent++;
      continue;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let result: DeliveryResult;
    let providerStarted = false;
    try {
      const message = inquiryNotificationMessage(prepared);
      providerStarted = true;
      result = await Promise.race([
        adapter.send(message, controller.signal),
        new Promise<DeliveryResult>((resolve) => {
          timer = setTimeout(() => {
            controller.abort();
            resolve({ kind: "ambiguous", code: "timeout" });
          }, timeoutMilliseconds);
        }),
      ]);
    } catch {
      result = providerStarted
        ? { kind: "ambiguous", code: "network" }
        : { kind: "permanent", code: "configuration" };
    } finally {
      if (timer) clearTimeout(timer);
    }
    result = sanitizedResult(result, adapter.mode);
    try {
      const state = await queue.finish(
        claim,
        result.kind,
        "code" in result ? result.code : "",
        result.kind === "accepted" ? result.providerMessageId : null,
        "retryAfterSeconds" in result ? (result.retryAfterSeconds ?? 0) : 0,
      );
      if (state === "test_recorded") counts.testRecorded++;
      else if (
        state === "accepted" ||
        state === "retry" ||
        state === "failed" ||
        state === "unknown" ||
        state === "canceled"
      )
        counts[state]++;
    } catch {
      // Provider may already have accepted. Keep the lease for durable recovery;
      // never turn an unacknowledged outcome into a success or immediate resend.
      counts.interrupted++;
    }
  }
  return counts;
}
