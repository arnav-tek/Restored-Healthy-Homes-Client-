import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import {
  authorizedNotificationWorker,
  configuredInquiryEmailAdapter,
} from "../../src/data/notifications/config";
import { dispatchInquiryNotifications } from "../../src/data/notifications/dispatcher";
import type {
  DeliveryResult,
  NotificationAdapter,
  NotificationQueue,
} from "../../src/data/notifications/contracts";
import {
  escapeNotificationHtml,
  inquiryNotificationMessage,
  trustedNotificationOrigin,
} from "../../src/data/notifications/template";
import { handleNotificationWorker } from "../../src/data/notifications/worker-handler";
import { handleNotificationAdmin } from "../../src/data/supabase/notification-admin-handler";
import { projectNotificationJobs } from "../../src/data/supabase/inquiry-notifications";
import { parseNotificationJobs } from "../../src/validation/inquiry-notifications";
import type {
  NotificationClaim,
  PreparedNotification,
} from "../../src/domain/inquiry-notification";
import { RecordingInquiryEmailAdapter } from "../helpers/inquiry-email-adapter";
const id = "00000000-0000-4000-8000-000000000001";
const claim: NotificationClaim = {
  id,
  lease: "00000000-0000-4000-8000-000000000002",
  attempt: 1,
};
const prepared: PreparedNotification = {
  id,
  inquiryId: id,
  to: "member@example.invalid",
  from: "notification-test@example.invalid",
  origin: "https://staging.example.invalid",
  mode: "test",
  idempotencyKey: `rhh-inquiry-notice-${id}`,
};
const configuration = { sender: prepared.from, origin: prepared.origin };
const token = "isolated-unit-test-worker-token-32-characters";
function setup(t: TestContext) {
  const previous = { ...process.env };
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_ORIGIN: "http://127.0.0.1:3230",
    RHH_AUTH_COOKIE_SECRET:
      "isolated-auth-cookie-secret-at-least-32-characters",
    RHH_INQUIRY_WORKER_SECRET: token,
    RHH_INQUIRY_EMAIL_PROVIDER: "disabled",
  });
  delete process.env.VERCEL_ENV;
  t.after(() => {
    process.env = previous;
  });
}
function queue(options: { prepareNull?: boolean; finishError?: boolean } = {}) {
  let claims = 0;
  const outcomes: Parameters<NotificationQueue["finish"]>[] = [];
  const value: NotificationQueue = {
    async claim() {
      return claims++ === 0 ? claim : null;
    },
    async prepare() {
      return options.prepareNull ? null : prepared;
    },
    async finish(...args) {
      outcomes.push(args);
      if (options.finishError)
        throw Error("private provider or database diagnostics");
      return (
        {
          test_recorded: "test_recorded",
          accepted: "accepted",
          temporary: "retry",
          permanent: "failed",
          ambiguous: "unknown",
        } as const
      )[args[1]];
    },
  };
  return { value, outcomes };
}
test("email template uses protected routing, trusted origins, escaped HTML and no private inquiry text", () => {
  const message = inquiryNotificationMessage({
    ...prepared,
    ...{
      message: "PRIVATE MESSAGE",
      name: "<script>alert(1)</script>",
      senderEmail: "sender@example.invalid",
    },
  });
  assert.equal(message.to, prepared.to);
  assert.equal(message.from, prepared.from);
  assert.match(
    message.html,
    new RegExp(`https://staging.example.invalid/member/inquiries/${id}`),
  );
  assert.match(message.text, /Sign in to read it/);
  assert.match(message.html, /Restored Healthy Homes/);
  assert.equal(message.html.includes("PRIVATE MESSAGE"), false);
  assert.equal(message.html.includes("<script>"), false);
  assert.equal(message.text.includes("sender@example.invalid"), false);
  assert.deepEqual(
    Object.keys(message).sort(),
    ["to", "from", "subject", "html", "text", "idempotencyKey"].sort(),
  );
  assert.equal(
    escapeNotificationHtml(`<a x="'">&`),
    "&lt;a x=&quot;&#39;&quot;&gt;&amp;",
  );
  for (const origin of [
    "https://trusted.invalid/path",
    "https://user:pass@trusted.invalid",
    "https://trusted.invalid?next=evil",
    "http://evil.invalid",
    "//evil.invalid",
    "https://trusted.invalid/",
  ])
    assert.throws(() => trustedNotificationOrigin(origin));
  for (const from of [
    "x@example.invalid\r\nBcc:bad@example.invalid",
    "bad@example.invalid\x00",
    "invalid",
  ])
    assert.throws(() => inquiryNotificationMessage({ ...prepared, from }));
});
test("recording adapter is explicit test-only, deduplicates keys and never reports acceptance", async () => {
  const adapter = new RecordingInquiryEmailAdapter();
  const message = inquiryNotificationMessage(prepared);
  assert.deepEqual(await adapter.send(message, new AbortController().signal), {
    kind: "test_recorded",
  });
  assert.deepEqual(await adapter.send(message, new AbortController().signal), {
    kind: "test_recorded",
  });
  assert.equal(adapter.recorded.length, 1);
  assert.equal(adapter.mode, "test");
  const q = queue();
  const result = await dispatchInquiryNotifications(
    q.value,
    adapter,
    configuration,
  );
  assert.equal(result.testRecorded, 1);
  assert.equal(result.accepted, 0);
  assert.equal(q.outcomes[0][1], "test_recorded");
});
test("worker authorization is constant-length compared and never accepts cookies, metadata or URL secrets", async (t) => {
  setup(t);
  t.mock.method(globalThis, "fetch", async () => {
    throw Error("No provider/Auth/queue request is allowed while paused");
  });
  assert.equal(authorizedNotificationWorker(`Bearer ${token}`, token), true);
  for (const value of [null, "Bearer short", "Basic admin", `Bearer ${token}x`])
    assert.equal(authorizedNotificationWorker(value, token), false);
  const req = (authorization?: string, path = "", body?: string) =>
    new NextRequest(
      `http://127.0.0.1:3230/api/internal/inquiry-notifications${path}`,
      {
        method: "POST",
        headers: {
          ...(authorization ? { authorization } : {}),
          cookie: "role=admin",
        },
        ...(body ? { body } : {}),
      },
    );
  for (const authorization of [
    undefined,
    "Bearer admin",
    "Bearer fake-member-role",
  ]) {
    const result = await handleNotificationWorker(req(authorization));
    assert.equal(result.status, 401);
    assert.match(
      result.headers.get("cache-control") ?? "",
      /private.*no-store/,
    );
  }
  assert.equal(
    (await handleNotificationWorker(req(`Bearer ${token}`))).status,
    503,
  );
  const emptyStream = new NextRequest(
    "http://127.0.0.1:3230/api/internal/inquiry-notifications",
    { method: "POST", headers: { authorization: `Bearer ${token}` }, body: "" },
  );
  assert.equal((await handleNotificationWorker(emptyStream)).status, 503);
  assert.equal(
    (await handleNotificationWorker(req(`Bearer ${token}`, "?to=bad"))).status,
    400,
  );
  assert.equal(
    (
      await handleNotificationWorker(
        req(`Bearer ${token}`, "", '{"recipient":"bad"}'),
      )
    ).status,
    400,
  );
  assert.equal(configuredInquiryEmailAdapter(), null);
  process.env.RHH_INQUIRY_EMAIL_PROVIDER = "test";
  assert.throws(() => configuredInquiryEmailAdapter());
  process.env.RHH_APP_MODE = "demo";
  assert.equal(
    (await handleNotificationWorker(req(`Bearer ${token}`))).status,
    404,
  );
});
test("test adapter cannot promote its result to provider acceptance", async () => {
  const adapter: NotificationAdapter = {
    name: "invalid-test-adapter",
    mode: "test",
    idempotencySeconds: 0,
    async send() {
      return { kind: "accepted", providerMessageId: "invented" };
    },
  };
  const q = queue();
  const result = await dispatchInquiryNotifications(
    q.value,
    adapter,
    configuration,
  );
  assert.equal(result.accepted, 0);
  assert.equal(result.failed, 1);
  assert.equal(q.outcomes[0][1], "permanent");
  assert.equal(q.outcomes[0][2], "adapter_contract");
});
test("provider failure classifications are bounded and diagnostics are never copied into queue outcomes", async () => {
  for (const result of [
    { kind: "temporary", code: "rate_limited", retryAfterSeconds: 999999 },
    { kind: "permanent", code: "rejected" },
    { kind: "ambiguous", code: "network" },
  ] as const) {
    const adapter: NotificationAdapter = {
      name: "recording-failure-test",
      mode: "test",
      idempotencySeconds: 0,
      async send() {
        return result;
      },
    };
    const q = queue();
    await dispatchInquiryNotifications(q.value, adapter, configuration);
    assert.equal(q.outcomes[0][1], result.kind);
    assert.ok(q.outcomes[0][4] <= 86400);
  }
  const broken: NotificationAdapter = {
    name: "throwing-test",
    mode: "test",
    idempotencySeconds: 0,
    async send() {
      throw Error("SECRET RAW RESPONSE");
    },
  };
  const q = queue();
  const result = await dispatchInquiryNotifications(
    q.value,
    broken,
    configuration,
  );
  assert.equal(result.unknown, 1);
  assert.equal(
    JSON.stringify(q.outcomes).includes("SECRET RAW RESPONSE"),
    false,
  );
});
test("provider timeout is ambiguous, aborts the request and cannot claim email success", async () => {
  let signal: AbortSignal | undefined;
  const adapter: NotificationAdapter = {
    name: "hanging-test",
    mode: "test",
    idempotencySeconds: 0,
    send(_message, value) {
      signal = value;
      return new Promise<DeliveryResult>(() => {});
    },
  };
  const q = queue();
  const result = await dispatchInquiryNotifications(
    q.value,
    adapter,
    configuration,
    5,
  );
  assert.equal(signal?.aborted, true);
  assert.equal(result.unknown, 1);
  assert.equal(result.accepted, 0);
  assert.equal(q.outcomes[0][2], "timeout");
});
test("a lost completion acknowledgement leaves recovery to the durable queue and never resends immediately", async () => {
  const adapter = new RecordingInquiryEmailAdapter();
  const q = queue({ finishError: true });
  const result = await dispatchInquiryNotifications(
    q.value,
    adapter,
    configuration,
  );
  assert.equal(result.interrupted, 1);
  assert.equal(result.testRecorded, 0);
  assert.equal(result.accepted, 0);
  assert.equal(adapter.calls, 1);
  const canceled = queue({ prepareNull: true });
  const canceledResult = await dispatchInquiryNotifications(
    canceled.value,
    adapter,
    configuration,
  );
  assert.equal(canceledResult.notSent, 1);
  assert.equal(adapter.calls, 1);
});
test("notification operation projections strip private routing, provider receipts, keys and unexpected fields", async (t) => {
  const now = "2026-11-12T00:00:00Z";
  const job = {
    id,
    inquiryId: id,
    state: "failed",
    attempts: 1,
    manualRetries: 0,
    version: 2,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
    acceptedAt: null,
    failureCode: "rejected",
    events: [
      { event: "permanent", attempt: 1, code: "rejected", at: now, reason: "" },
    ],
  };
  const raw = {
    page: 1,
    hasNext: false,
    jobs: [
      {
        ...job,
        recipient_email: "PRIVATE",
        recipient_id: "PRIVATE",
        provider_message_id: "PRIVATE",
        token_hash: "PRIVATE",
        message: "PRIVATE",
      },
    ],
    key: "PRIVATE",
  };
  const result = projectNotificationJobs(raw);
  assert.equal(JSON.stringify(result).includes("PRIVATE"), false);
  assert.deepEqual(result.jobs[0], job);
  assert.equal(
    parseNotificationJobs({ ...raw, jobs: [{ ...job, state: "delivered" }] }),
    null,
  );
  assert.throws(() =>
    projectNotificationJobs({
      ...raw,
      jobs: [{ ...job, events: [{ ...job.events[0], code: "PRIVATE" }] }],
    }),
  );
  setup(t);
  const response = await handleNotificationAdmin(
    new NextRequest("http://127.0.0.1:3230/api/admin/inquiry-notifications"),
  );
  assert.equal(response.status, 401);
  assert.match(
    response.headers.get("cache-control") ?? "",
    /private.*no-store/,
  );
});
