import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  parseConsultationSubmission,
  parseConsultationAction,
  parseConsultationWorkspace,
} from "../../src/validation/connected-consultations";
import { handleConsultations } from "../../src/data/supabase/consultation-handler";
import { parseConsultationPreference } from "../../src/validation/connected-consultations";
const id = "00000000-0000-4000-8000-000000000001";
const input = {
  requestId: id,
  token: "a".repeat(64),
  name: "Visitor",
  email: "visitor@example.invalid",
  categoryId: "mold-inspection",
  format: "phone",
  topic: "I would like guidance about home inspection.",
};

test("participation accepts only a boolean choice and bounded saved version", () => {
  assert.deepEqual(
    parseConsultationPreference({ enabled: false, version: 3 }),
    { enabled: false, version: 3 },
  );
  for (const change of [
    { ownerId: id },
    { professionalId: id },
    { role: "admin" },
    { approval: "approved" },
    { membership: "active" },
    { suspended: false },
    { enabled: "true" },
    { version: 0 },
    { version: 1.5 },
    { version: 1e12 },
  ])
    assert.equal(
      parseConsultationPreference({ enabled: true, version: 1, ...change }),
      null,
    );
});
test("a stale tab cannot cancel the different request in the shared receipt cookie", async (t) => {
  const old = { ...process.env };
  const origin = "http://127.0.0.1:3230";
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_ORIGIN: origin,
    RHH_AUTH_COOKIE_SECRET: "test-only-secret".repeat(4),
  });
  delete process.env.VERCEL_ENV;
  t.after(() => {
    process.env = old;
  });
  const other = "00000000-0000-4000-8000-000000000002";
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.payload.requestId, other);
      assert.equal(body.payload.token, input.token);
      return Response.json({
        status: body.action === "cancel" ? "cancelled" : "requested",
        version: 1,
        categoryId: "mold-inspection",
        token: "MUST_NOT_LEAK",
      });
    },
  );
  const headers = {
    origin,
    "content-type": "application/json",
    cookie:
      "rhh_consultation_receipt=" +
      encodeURIComponent(
        JSON.stringify({ requestId: other, token: input.token }),
      ),
  };
  const send = (body: unknown) =>
    handleConsultations(
      new NextRequest(origin + "/api/consultations", {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      }),
      "public",
    );
  const stale = await send({ requestId: id, version: 1 });
  assert.equal(stale.status, 409);
  assert.equal(calls, 0);
  const missing = await send({ version: 1 });
  assert.equal(missing.status, 400);
  assert.equal(calls, 0);
  const status = await handleConsultations(
    new NextRequest(origin + "/api/consultations", { headers }),
    "public",
  );
  assert.deepEqual(await status.json(), {
    requestId: other,
    status: "requested",
    version: 1,
    categoryId: "mold-inspection",
  });
  const valid = await send({ requestId: other, version: 1 });
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), {
    requestId: other,
    status: "cancelled",
    version: 1,
    categoryId: "mold-inspection",
  });
  assert.equal(calls, 2);
});
test("consultation intake bounds and explicit field allowlist reject forged authority", () => {
  assert.ok(parseConsultationSubmission(input));
  for (const change of [
    { token: "short" },
    { name: "" },
    { topic: "short" },
    { email: "invalid" },
    { status: "accepted" },
    { professionalId: id },
    { format: "video" },
    { topic: "x".repeat(2001) },
  ])
    assert.equal(parseConsultationSubmission({ ...input, ...change }), null);
});
test("consultation role actions require exact version and permitted fields", () => {
  assert.ok(
    parseConsultationAction({ id, version: 1, action: "accept" }, false),
  );
  assert.equal(
    parseConsultationAction(
      { id, version: 1, action: "assign", professionalId: id },
      false,
    ),
    null,
  );
  assert.equal(
    parseConsultationAction({ id, version: 0, action: "cancel" }, true),
    null,
  );
  assert.equal(
    parseConsultationAction(
      { id, version: 1, action: "accept", ownerId: id },
      false,
    ),
    null,
  );
  assert.ok(
    parseConsultationAction(
      { id, version: 1, action: "note", note: "Coordination note" },
      true,
    ),
  );
});
test("member projections strip contact and private coordination data", () => {
  const item = {
    id,
    version: 1,
    categoryId: "mold-inspection",
    topic: input.topic,
    format: "phone",
    status: "assigned",
    professionalId: id,
    createdAt: "2026-11-15T00:00:00Z",
    name: "Private name",
    email: "private@example.invalid",
    note: "Private note",
    assigned_owner: id,
  };
  const raw = { items: [item], page: 1, hasNext: false, candidates: [] };
  const member = parseConsultationWorkspace(raw, false)!;
  for (const key of ["name", "email", "note", "assigned_owner"])
    assert.equal(key in member.items[0], false);
  assert.equal(
    parseConsultationWorkspace(raw, true)?.items[0].email,
    item.email,
  );
});
test("consultation API denies cross-origin mutation without database calls", async (t) => {
  for (const [key, value] of Object.entries({
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_COOKIE_SECRET: "test-only-secret".repeat(4),
  })) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
  const before = {
    mode: process.env.RHH_APP_MODE,
    origin: process.env.RHH_AUTH_ORIGIN,
  };
  process.env.RHH_APP_MODE = "staging";
  process.env.RHH_AUTH_ORIGIN = "http://127.0.0.1:3230";
  try {
    const response = await handleConsultations(
      new NextRequest("http://127.0.0.1:3230/api/consultations", {
        method: "POST",
        headers: { origin: "https://untrusted.example" },
      }),
      "public",
    );
    assert.equal(response.status, 403);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  } finally {
    if (before.mode === undefined) delete process.env.RHH_APP_MODE;
    else process.env.RHH_APP_MODE = before.mode;
    if (before.origin === undefined) delete process.env.RHH_AUTH_ORIGIN;
    else process.env.RHH_AUTH_ORIGIN = before.origin;
  }
});
