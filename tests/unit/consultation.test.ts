import { demoDirectory } from "../../src/data/demo/repository";
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConsultation } from "../../src/validation/consultation";
import {
  consultationOffer,
  consultationOfferLabel,
  type ConsultationFields,
} from "../../src/domain/consultation";
import { categories } from "../../src/domain/categories";
import {
  createDemoSession,
  reduceDemoSession,
} from "../../src/domain/demo-member";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import { publicSessionQuestions } from "../../src/domain/qa-session";
import { demoQaRepository } from "../../src/data/demo/qa-repository";
const valid: ConsultationFields = {
  name: "Sample Homeowner",
  email: "homeowner@example.invalid",
  categoryId: "healthy-designers",
  format: "no-preference",
  topic: "A fictional project question about a sample materials schedule.",
};
const seed = getDemoSessionSeed();
test("consultation fields trim and enforce text types, lengths, email, category and format enums", () => {
  assert.deepEqual(
    parseConsultation(
      Object.fromEntries(
        Object.entries(valid).map(([key, value]) => [key, `  ${value}  `]),
      ),
    ),
    { ok: true, fields: valid },
  );
  for (const field of Object.keys(valid))
    for (const value of [null, undefined, 2, [], {}, ""])
      assert.equal(parseConsultation({ ...valid, [field]: value }).ok, false);
  for (const [field, values] of Object.entries({
    name: ["x", "x".repeat(101)],
    email: [
      "bad",
      "a@b",
      "a b@example.invalid",
      "a".repeat(243) + "@example.com",
    ],
    topic: ["x".repeat(19), "x".repeat(2001)],
    categoryId: ["missing", "Healthy Home Designers"],
    format: ["email", "Phone", "booked", "unknown"],
  }))
    for (const value of values)
      assert.equal(parseConsultation({ ...valid, [field]: value }).ok, false);
  for (const [name, topic] of [
    ["ab", "x".repeat(20)],
    ["x".repeat(100), "x".repeat(2000)],
  ])
    assert.equal(
      parseConsultation({
        ...valid,
        name,
        topic,
        email: "a".repeat(242) + "@example.com",
      }).ok,
      true,
    );
  for (const category of [...categories].reverse())
    for (const format of ["phone", "no-preference"])
      assert.equal(
        parseConsultation({ ...valid, categoryId: category.id, format }).ok,
        true,
      );
});
test("consultation allowlist ignores forged offer, payment, appointment and identity fields", () => {
  const forged = {
    ...valid,
    id: "forged",
    status: "confirmed",
    paymentStatus: "paid",
    price: 1,
    currency: "EUR",
    durationMinutes: 999,
    offer: { amountCents: 1 },
    providerId: "member-example-approved",
    scheduledAt: "tomorrow",
    phone: "unwanted",
    unknown: "unwanted",
  };
  assert.deepEqual(parseConsultation(forged), { ok: true, fields: valid });
  const state = reduceDemoSession(
    createDemoSession(seed),
    { type: "request-consultation", fields: forged },
    seed,
  );
  const request = state.consultations[0];
  assert.deepEqual(Object.keys(request).sort(), [
    "adminNote",
    "categoryId",
    "email",
    "format",
    "id",
    "name",
    "offer",
    "paymentStatus",
    "providerId",
    "scheduledAt",
    "status",
    "topic",
  ]);
  assert.equal(request.status, "requested");
  assert.equal(request.paymentStatus, "not-collected");
  assert.equal(request.providerId, null);
  assert.equal(request.scheduledAt, null);
  assert.deepEqual(request.offer, consultationOffer);
  assert.notEqual(request.offer, consultationOffer);
  assert.match(request.id, /^demo-consultation-\d+$/);
  assert.equal(state.consultationId, request.id);
  assert.equal(consultationOfferLabel(), "Free phone consultation");
});
test("duplicate consultation actions are idempotent until deliberate restart; reset clears requests and preserves ID uniqueness", () => {
  let state = createDemoSession(seed);
  const action = { type: "request-consultation", fields: valid } as const;
  assert.equal(
    reduceDemoSession(state, { type: "new-consultation" }, seed),
    state,
  );
  const invalid = { ...action, fields: { ...valid, topic: "short" } };
  assert.equal(reduceDemoSession(state, invalid, seed), state);
  state = reduceDemoSession(state, action, seed);
  const id = state.consultations[0].id;
  assert.equal(reduceDemoSession(state, action, seed), state);
  state = reduceDemoSession(state, { type: "new-consultation" }, seed);
  assert.equal(state.consultations.length, 1);
  assert.equal(state.consultationId, null);
  state = reduceDemoSession(state, action, seed);
  assert.equal(state.consultations.length, 2);
  assert.equal(state.consultations[0].id, id);
  assert.notEqual(state.consultations[1].id, id);
  const ids = state.consultations.map((item) => item.id);
  state = reduceDemoSession(state, { type: "reset" }, seed);
  assert.equal(state.consultations.length, 0);
  assert.equal(state.consultationId, null);
  state = reduceDemoSession(state, action, seed);
  assert.ok(!ids.includes(state.consultations[0].id));
});
test("consultation requests remain separate from existing member, inbox and public Q&A workflows", async () => {
  const snapshot = await demoQaRepository.listPublic();
  let state = createDemoSession(seed, snapshot, (await demoDirectory.listPublic()).map(({ id }) => id));
  state = reduceDemoSession(
    state,
    { type: "request-consultation", fields: valid },
    seed,
  );
  const request = state.consultations[0];
  assert.deepEqual(state.records, seed.records);
  assert.deepEqual(state.inquiries, seed.inquiries);
  assert.deepEqual(publicSessionQuestions(state), snapshot);
  state = reduceDemoSession(
    state,
    {
      type: "submit-question",
      question: {
        title: "Another fictional question",
        body: "A sample question that remains separate from consultations.",
        categoryId: valid.categoryId,
      },
    },
    seed,
  );
  state = reduceDemoSession(
    state,
    {
      type: "demo-sign-in",
      fields: { email: "pending@example.invalid", passcode: "home-access" },
    },
    seed,
  );
  assert.equal(state.consultations[0], request);
  assert.equal(state.questions[0].status, "pending");
  state = reduceDemoSession(state, { type: "reset" }, seed);
  assert.deepEqual(publicSessionQuestions(state), snapshot);
  assert.deepEqual(state.records, seed.records);
  assert.equal(state.consultations.length, 0);
  assert.equal(state.questions.length, 0);
});
