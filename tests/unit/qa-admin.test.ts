import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "../../src/data/supabase/database.types";
import { handleAdminQa } from "../../src/data/supabase/qa-admin-handler";
import { loadAdminQa, moderateQa } from "../../src/data/supabase/qa-admin";
import {
  parseAdminQa,
  parseQaAdminFilters,
  parseQaDecision,
} from "../../src/validation/qa-admin";
import {
  parseMemberQa,
  parsePublicQa,
} from "../../src/validation/connected-qa";
import { qaActions } from "../../src/domain/qa-admin";
const id = "00000000-0000-4000-8000-000000000001";
const decision = {
  kind: "answer" as const,
  id,
  version: 2,
  parentVersion: 3,
  action: "publish" as const,
  reason: "Reviewed local fixture",
  note: "Private test note",
};
const item = {
  kind: "answer",
  id,
  questionId: id,
  title: "Test question",
  body: "Test answer for private moderation only",
  categoryId: "mold-inspection",
  status: "pending",
  version: 2,
  parentStatus: "published",
  parentVersion: 3,
  note: "Private test note",
  attribution: "Local specialist",
  answerCount: 0,
  canPublish: true,
};
test("moderation filters and mutations reject forged authority, private destinations and unsafe versions", () => {
  assert.ok(parseQaDecision(decision));
  for (const key of [
    "actorId",
    "status",
    "ownerId",
    "body",
    "recipientEmail",
    "reviewedAt",
  ])
    assert.equal(parseQaDecision({ ...decision, [key]: id }), null);
  assert.equal(parseQaDecision({ ...decision, parentVersion: null }), null);
  assert.equal(parseQaDecision({ ...decision, version: 0 }), null);
  assert.equal(parseQaDecision({ ...decision, note: "x".repeat(501) }), null);
  assert.equal(parseQaDecision({ ...decision, reason: " " }), null);
  for (const raw of [
    { page: "0" },
    { id: "guessed" },
    { queue: "other" },
    { role: "admin" },
    { status: ["all"] },
    { parent: "https://evil.invalid" },
  ])
    assert.equal(parseQaAdminFilters(raw), null);
  assert.ok(
    parseQaAdminFilters({
      queue: "answers",
      status: "hidden",
      page: "2",
      parent: id,
    }),
  );
  assert.deepEqual(qaActions("hidden"), ["restore", "reject"]);
  assert.deepEqual(qaActions("rejected"), ["restore"]);
});
test("moderation DTOs are allowlisted; member/public projections exclude moderator and notification data", () => {
  const data = parseAdminQa({
    queue: "answers",
    page: 1,
    total: 1,
    hasNext: false,
    catalog: [],
    counts: {
      questions: 1,
      answers: 1,
      pendingQuestions: 0,
      pendingAnswers: 1,
    },
    items: [{ ...item, recipientEmail: "SECRET" }],
    detail: { ...item, history: [], recipientEmail: "SECRET" },
    secret: "SECRET",
  });
  assert.ok(data);
  assert.equal(JSON.stringify(data).includes("SECRET"), false);
  const q = {
    id,
    title: item.title,
    body: item.body,
    categoryId: item.categoryId,
  };
  const member = parseMemberQa({
    eligible: true,
    catalog: [],
    questions: [],
    question: null,
    page: 1,
    hasNext: false,
    answers: [
      {
        ...item,
        parentStatus: "hidden",
        note: "SECRET",
        reason: "SECRET",
        actorId: "SECRET",
        recipientEmail: "SECRET",
      },
    ],
  });
  assert.ok(member);
  assert.equal(member.answers[0].parentStatus, "hidden");
  assert.equal(JSON.stringify(member).includes("SECRET"), false);
  const pub = parsePublicQa({
    catalog: [],
    questions: [
      {
        ...q,
        note: "SECRET",
        answers: [
          {
            id,
            body: item.body,
            attribution: "Specialist",
            note: "SECRET",
            reason: "SECRET",
            recipientEmail: "SECRET",
          },
        ],
      },
    ],
  });
  assert.ok(pub);
  assert.equal(JSON.stringify(pub).includes("SECRET"), false);
});
test("anonymous moderation and foreign-origin actions fail before private data access", async (t) => {
  const old = { ...process.env };
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_ORIGIN: "http://127.0.0.1:3230",
    RHH_AUTH_COOKIE_SECRET: "test-only-secret-00000000000000000000",
  });
  delete process.env.VERCEL_ENV;
  t.after(() => {
    process.env = old;
  });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw new Error("Unexpected network");
  });
  for (const method of ["GET", "POST"]) {
    const r = await handleAdminQa(
      new NextRequest("http://127.0.0.1:3230/api/admin/questions", {
        method,
        headers: { origin: "http://127.0.0.1:3230" },
        ...(method === "POST" ? { body: JSON.stringify(decision) } : {}),
      }),
    );
    assert.equal(r.status, 401);
    assert.match(r.headers.get("cache-control")!, /private.*no-store/);
  }
  const foreign = await handleAdminQa(
    new NextRequest("http://127.0.0.1:3230/api/admin/questions", {
      method: "POST",
      headers: { origin: "https://evil.invalid" },
      body: "{}",
    }),
  );
  assert.equal(foreign.status, 403);
  assert.equal(calls, 0);
});
test("every moderation read/write uses current database authorization and sanitizes conflicts/denials", async () => {
  let calls = 0;
  const client = createClient<AuthDatabase>(
    "https://example.supabase.co",
    "sb_publishable_test",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async () => {
          calls++;
          return Response.json(
            {
              code: calls === 1 ? "42501" : "PT409",
              message: "SECRET_DIAGNOSTIC",
            },
            { status: calls === 1 ? 403 : 409 },
          );
        },
      },
    },
  );
  await assert.rejects(
    () => loadAdminQa(client, parseQaAdminFilters({})!),
    /Current administrator access/,
  );
  await assert.rejects(
    () => moderateQa(client, decision),
    (e) =>
      e instanceof Error &&
      !e.message.includes("SECRET") &&
      e.message.includes("draft is retained"),
  );
  assert.equal(calls, 2);
});
