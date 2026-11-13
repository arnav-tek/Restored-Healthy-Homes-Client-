import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import {
  parsePublicQa,
  parseMemberQa,
  parseQuestionPayload,
  parseAnswerPayload,
} from "../../src/validation/connected-qa";
import { handleQaRequest } from "../../src/data/supabase/qa-handler";
import { safeAuthReturn } from "../../src/validation/auth";
import { submitQuestion } from "../../src/data/supabase/qa";
const id = "00000000-0000-4000-8000-000000000001",
  answerId = "00000000-0000-4000-8000-000000000002";
const catalog = [
  { id: "mold-inspection", name: "Mold inspection", active: true },
];
const question = {
  id,
  title: "Public service question",
  body: "Published service question with sufficient detail.",
  categoryId: catalog[0].id,
  answers: [
    {
      id: answerId,
      body: "Published specialist service answer.",
      attribution: "Public business",
      profileHref: `/professionals/${id}`,
    },
  ],
};
function setup(t: import("node:test").TestContext) {
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
}
test("public Q&A projection strips private records, contacts, author IDs and unsafe attribution links", () => {
  const data = parsePublicQa({
    catalog: [{ ...catalog[0], internalNote: "PRIVATE" }],
    questions: [
      {
        ...question,
        contactEmail: "PRIVATE",
        moderationNote: "PRIVATE",
        answers: [
          {
            ...question.answers[0],
            authorId: "PRIVATE",
            moderationNote: "PRIVATE",
            profileHref: "https://evil.invalid",
          },
        ],
      },
    ],
    privateRows: "PRIVATE",
  });
  assert.ok(data);
  assert.equal(JSON.stringify(data).includes("PRIVATE"), false);
  assert.equal(data.questions[0].answers[0].profileHref, undefined);
  assert.equal(
    parsePublicQa({
      catalog,
      questions: [{ ...question, id: "demo-session-question-1" }],
    }),
    null,
  );
  assert.equal(
    parsePublicQa({
      catalog,
      questions: [
        { ...question, answers: [{ ...question.answers[0], id: "bad" }] },
      ],
    }),
    null,
  );
});
test("member Q&A projection excludes homeowner contacts and other private fields", () => {
  const data = parseMemberQa({
    eligible: true,
    catalog,
    questions: [question],
    question,
    answers: [
      {
        id: answerId,
        questionId: id,
        body: "Own pending answer",
        status: "pending",
        version: 2,
        internalNote: "PRIVATE",
        authorId: "PRIVATE",
      },
    ],
    page: 1,
    hasNext: false,
    contactEmail: "PRIVATE",
  });
  assert.ok(data);
  assert.equal(JSON.stringify(data).includes("PRIVATE"), false);
  assert.equal(data.answers[0].version, 2);
  assert.equal(
    parseMemberQa({ ...data, answers: [{ ...data.answers[0], version: 0 }] }),
    null,
  );
});
test("question/answer inputs reject forged roles, publication, contacts and stale-version syntax", () => {
  const fields = {
    requestId: id,
    title: question.title,
    body: question.body,
    categoryId: catalog[0].id,
  };
  assert.ok(parseQuestionPayload(fields, catalog));
  for (const extra of [
    { status: "published" },
    { authorId: id },
    { contactEmail: "private@example.invalid" },
    { createdAt: "2026-01-01" },
  ])
    assert.equal(parseQuestionPayload({ ...fields, ...extra }, catalog), null);
  assert.equal(
    parseQuestionPayload({ ...fields, categoryId: "missing" }, catalog),
    null,
  );
  for (const extra of [
    { status: "published" },
    { authorId: id },
    { professionalId: id },
    { verified: true },
    { version: 0 },
    { version: "1" },
  ])
    assert.equal(
      parseAnswerPayload({
        questionId: id,
        body: "Pending service answer with detail.",
        ...extra,
      }),
      null,
    );
  assert.deepEqual(
    parseAnswerPayload({
      questionId: id,
      body: " Pending service answer with detail. ",
      version: 2,
    }),
    { questionId: id, body: "Pending service answer with detail.", version: 2 },
  );
});
test("Q&A APIs deny anonymous inbox/write and cross-site submission without trusting browser roles", async (t) => {
  setup(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw Error("Network not expected");
  });
  const r = await handleQaRequest(
    new NextRequest("http://127.0.0.1:3230/api/member/questions", {
      headers: { cookie: "role=admin" },
    }),
  );
  assert.equal(r.status, 401);
  assert.match(r.headers.get("cache-control")!, /no-store/);
  const forged = await handleQaRequest(
    new NextRequest("http://127.0.0.1:3230/api/questions", {
      method: "POST",
      headers: {
        origin: "https://evil.invalid",
        "content-type": "application/json",
      },
      body: "{}",
    }),
    true,
  );
  assert.equal(forged.status, 403);
  assert.equal(calls, 0);
});
test("submission acknowledges only committed RPC receipt and sanitizes backend failures", async (t) => {
  setup(t);
  const payload = {
    requestId: id,
    title: question.title,
    body: question.body,
    categoryId: catalog[0].id,
  };
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      saved: true,
      status: "pending",
      privateContact: "PRIVATE",
    }),
  );
  assert.deepEqual(await submitQuestion(payload), {
    saved: true,
    status: "pending",
  });
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { code: "PT429", message: "PRIVATE DIAGNOSTIC" },
      { status: 429 },
    ),
  );
  await assert.rejects(
    () => submitQuestion(payload),
    (e) =>
      e instanceof Error &&
      !e.message.includes("PRIVATE") &&
      "status" in e &&
      e.status === 429,
  );
});
test("category inbox return paths allow only exact local UUID destinations", () => {
  assert.equal(
    safeAuthReturn(`/member/questions/${id}`),
    `/member/questions/${id}`,
  );
  assert.equal(safeAuthReturn("/member/questions"), "/member/questions");
  for (const value of [
    `/member/questions/${id}?returnTo=https://evil.invalid`,
    `/member/questions/${id}/other`,
    "//evil.invalid",
    "/member/questions/demo-session-question-1",
    "/member/questions/%2F%2Fevil.invalid",
  ])
    assert.equal(safeAuthReturn(value), "/member");
});
