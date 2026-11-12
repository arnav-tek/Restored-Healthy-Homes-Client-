import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { handleInquiryRequest } from "../../src/data/supabase/inquiry-handlers";
import {
  projectInboxDetail,
  projectInboxPage,
} from "../../src/data/supabase/inbox";
import {
  parseInboxPage,
  parseInquiryReadState,
  parseInquirySubmission,
} from "../../src/validation/connected-inquiry";
const origin = "http://127.0.0.1:3230";
const id = "00000000-0000-4000-8000-000000000001";
const input = {
  professionalId: id,
  requestId: "00000000-0000-4000-8000-000000000002",
  name: "Test sender",
  email: "sender@example.invalid",
  message: "A test-only service inquiry.",
};
function setup(t: TestContext) {
  const old = { ...process.env };
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_ORIGIN: origin,
    RHH_AUTH_COOKIE_SECRET: "local-test-secret-with-at-least-32-characters",
  });
  delete process.env.VERCEL_ENV;
  t.after(() => {
    process.env = old;
  });
}
function request(
  body: unknown,
  options: {
    origin?: string;
    raw?: boolean;
    path?: string;
    method?: string;
  } = {},
) {
  const method = options.method ?? "POST";
  return new NextRequest(origin + (options.path ?? "/api/inquiries"), {
    method,
    headers: {
      origin: options.origin ?? origin,
      "content-type": "application/json",
    },
    ...(method !== "GET"
      ? { body: options.raw ? String(body) : JSON.stringify(body) }
      : {}),
  });
}
test("inquiry allowlists reject protected fields, malformed IDs and invalid fields", () => {
  assert.equal(parseInquirySubmission(input).ok, true);
  for (const key of [
    "ownerId",
    "recipientId",
    "recipientEmail",
    "role",
    "readAt",
    "createdAt",
    "internalNotes",
  ])
    assert.equal(parseInquirySubmission({ ...input, [key]: id }).ok, false);
  for (const value of [
    null,
    [],
    {},
    { ...input, name: "" },
    { ...input, message: "short" },
    { ...input, email: "invalid" },
    { ...input, message: "x".repeat(2001) },
    { ...input, requestId: "bad" },
  ])
    assert.equal(parseInquirySubmission(value).ok, false);
  assert.equal(
    parseInquiryReadState({ id, read: true, version: 1 })?.read,
    true,
  );
  for (const value of [
    { id, read: true, version: 0 },
    { id, read: 1, version: 1 },
    { id, read: true, version: 1, recipientId: id },
  ])
    assert.equal(parseInquiryReadState(value), null);
  for (const value of ["0", "01", "-1", "1.5", "1e2", "10001"])
    assert.equal(parseInboxPage(value), null);
  assert.equal(parseInboxPage(null), 1);
  assert.equal(parseInboxPage("10000"), 10000);
});
test("inbox projections exclude ownership, notes, other messages and abuse identifiers", () => {
  const detail = {
    id,
    professionalId: id,
    name: input.name,
    email: input.email,
    message: input.message,
    createdAt: "2026-11-12T00:00:00Z",
    readAt: null,
    version: 1,
  };
  const widened = {
    ...detail,
    recipient_id: id,
    internalNotes: "private",
    secret: "private",
    inquiries: [detail],
  };
  assert.deepEqual(projectInboxDetail(widened), detail);
  assert.deepEqual(
    projectInboxPage({
      items: [widened],
      page: 1,
      hasNext: false,
      secret: "private",
    }),
    {
      items: [
        { id, name: input.name, createdAt: detail.createdAt, readAt: null },
      ],
      page: 1,
      hasNext: false,
    },
  );
  assert.equal(projectInboxDetail(null), null);
  assert.throws(() => projectInboxDetail({ ...detail, createdAt: "bad" }));
  assert.throws(() =>
    projectInboxPage({ items: Array(21).fill(detail), page: 1, hasNext: true }),
  );
});
test("public handler bounds bodies, rejects cross-origin/protected input and keeps responses private", async (t) => {
  setup(t);
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Invalid inputs must not reach the database");
  });
  for (const [req, status] of [
    [request(input, { origin: "https://untrusted.invalid" }), 403],
    [request({ ...input, ownerId: id }), 400],
    [request("invalid", { raw: true }), 400],
    [request("x".repeat(17000), { raw: true }), 413],
    [request(input, { path: "/api/inquiries?recipient=x" }), 400],
  ] as const) {
    const result = await handleInquiryRequest(req, true);
    assert.equal(result.status, status);
    assert.match(
      result.headers.get("cache-control") ?? "",
      /private.*no-store/,
    );
  }
  assert.equal(
    (
      await handleInquiryRequest(
        request(null, { path: "/api/member/inquiries", method: "GET" }),
      )
    ).status,
    401,
  );
  process.env.RHH_APP_MODE = "demo";
  assert.equal((await handleInquiryRequest(request(input), true)).status, 404);
});
test("submission transport acknowledges only committed RPC results and sanitizes database failures", async (t) => {
  setup(t);
  let response: unknown = { saved: true },
    status = 200,
    calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls++;
      assert.deepEqual(JSON.parse(String(init?.body)), { payload: input });
      assert.equal(init?.cache, "no-store");
      return Response.json(response, { status });
    },
  );
  assert.deepEqual(
    await (await handleInquiryRequest(request(input), true)).json(),
    { saved: true },
  );
  for (const [code, message, expected] of [
    ["P0002", "inquiry_unavailable", 404],
    ["PT404", "inquiry_unavailable", 404],
    ["P0001", "inquiry_rate_limited", 429],
    ["PT429", "inquiry_rate_limited", 429],
    ["PT409", "inquiry_state_conflict", 409],
    ["22023", "invalid_inquiry", 400],
    ["42501", "private permission details", 503],
    ["XX000", "private database details", 503],
  ] as const) {
    response = { code, message };
    status = 400;
    const result = await handleInquiryRequest(request(input), true);
    assert.equal(result.status, expected);
    assert.equal(
      JSON.stringify(await result.json()).includes("private database details"),
      false,
    );
  }
  status = 200;
  response = { saved: false };
  assert.equal((await handleInquiryRequest(request(input), true)).status, 503);
  assert.equal(calls, 10);
});
