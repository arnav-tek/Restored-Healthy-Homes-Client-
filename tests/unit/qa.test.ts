import { test } from "node:test";
import assert from "node:assert/strict";
import { categories } from "../../src/domain/categories";
import {
  parseQaQuery,
  parseQuestion,
  qaHref,
  safeQaReturn,
  questionHref,
} from "../../src/validation/qa";
import {
  projectPublicQuestion,
  searchPublicQuestions,
} from "../../src/domain/qa";
import { demoQuestions, demoAnswers } from "../../src/data/demo/qa-fixtures";
import { demoQaRepository } from "../../src/data/demo/qa-repository";
import { demoDirectory } from "../../src/data/demo/repository";
import {
  createDemoSession,
  reduceDemoSession,
} from "../../src/domain/demo-member";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";

const valid = {
  title: "A fictional planning question",
  categoryId: "healthy-designers",
  body: "What documents could a fictional project handover include?",
};
test("Q&A input validation allowlists fields, normalizes text and enforces category/type/length boundaries", () => {
  const parsed = parseQuestion({ ...valid, title: `  ${valid.title}  ` });
  assert.deepEqual(parsed, { ok: true, question: valid });
  for (const [field, values] of Object.entries({
    title: [null, [valid.title], "x".repeat(9), "x".repeat(161)],
    body: [42, [], "x".repeat(19), "x".repeat(2001)],
    categoryId: [[], null, "unknown", "Healthy Home Designers"],
  })) {
    for (const value of values)
      assert.equal(parseQuestion({ ...valid, [field]: value }).ok, false);
  }
  for (const [title, body] of [
    ["x".repeat(10), "x".repeat(20)],
    ["x".repeat(160), "x".repeat(2000)],
  ])
    assert.equal(parseQuestion({ ...valid, title, body }).ok, true);
  for (const category of [...categories].reverse())
    assert.equal(parseQuestion({ ...valid, categoryId: category.id }).ok, true);
});
test("Q&A queries reject duplicate/invalid/oversized filters and canonical return URLs cannot leave results", () => {
  assert.deepEqual(
    parseQaQuery({
      q: "  planning   scope  ",
      category: "mold-inspection",
      page: "2",
    }),
    {
      query: { q: "planning scope", category: "mold-inspection", page: 2 },
      errors: {},
    },
  );
  for (const params of [
    { q: ["a", "b"] },
    { category: ["healthy-designers"] },
    { page: ["2"] },
    { q: "x".repeat(121) },
    { category: "unknown" },
    { page: "0" },
    { page: "1.2" },
    { page: "10001" },
    { page: "Infinity" },
  ])
    assert.ok(Object.keys(parseQaQuery(params).errors).length);
  for (const unsafe of [
    undefined,
    ["/questions"],
    "https://evil.invalid/questions",
    "//evil.invalid",
    "/questions/ask",
    "/questions-extra",
    "/questions#frag",
    "/questions\\evil",
    "/questions\n",
    "/questions?q=one&q=two",
    "/questions?category=unknown",
    "/questions?page=0",
    "/%71uestions",
    "javascript:alert(1)",
  ])
    assert.equal(safeQaReturn(unsafe), "/questions");
  assert.equal(
    safeQaReturn(
      "/questions?category=healthy-designers&page=2&q=sample&ignore=secret",
    ),
    "/questions?q=sample&category=healthy-designers&page=2",
  );
  assert.equal(
    safeQaReturn("/questions?q=%2F%2Fevil.invalid"),
    "/questions?q=%2F%2Fevil.invalid",
  );
  assert.equal(qaHref({ q: "", category: "", page: 1 }), "/questions");
  assert.equal(
    questionHref("planning-inspection", "//evil.invalid"),
    "/questions/planning-inspection?returnTo=%2Fquestions",
  );
});
test("publication gates questions, answers and parent association before public projection", () => {
  const question = demoQuestions[0];
  assert.equal(
    projectPublicQuestion(
      { ...question, status: "pending" },
      demoAnswers,
      () => undefined,
    ),
    null,
  );
  assert.equal(
    projectPublicQuestion(
      { ...question, status: "rejected" },
      demoAnswers,
      () => undefined,
    ),
    null,
  );
  const projected = projectPublicQuestion(
    question,
    demoAnswers,
    () => undefined,
  )!;
  assert.deepEqual(Object.keys(projected).sort(), [
    "answers",
    "body",
    "categoryId",
    "id",
    "title",
  ]);
  assert.equal(projected.answers.length, 2);
  assert.deepEqual(Object.keys(projected.answers[0]).sort(), [
    "attribution",
    "body",
    "id",
  ]);
  assert.ok(!JSON.stringify(projected).includes("QA_PRIVATE"));
  assert.ok(!JSON.stringify(projected).includes("QA_UNPUBLISHED"));
  assert.ok(
    !JSON.stringify(projected).includes("QA_PUBLISHED_ANSWER_HIDDEN_PARENT"),
  );
});
test("public search applies categories and keyword before counts/pages, covers all categories and clamps pages", async () => {
  const all = demoQuestions.flatMap((question) => {
    const value = projectPublicQuestion(question, demoAnswers, () => undefined);
    return value ? [value] : [];
  });
  const first = searchPublicQuestions(all, { q: "", category: "", page: 1 });
  const last = searchPublicQuestions(all, { q: "", category: "", page: 999 });
  assert.equal(first.total, 10);
  assert.equal(first.items.length, 6);
  assert.equal(last.page, 2);
  assert.equal(last.items.length, 4);
  assert.equal(
    new Set([...first.items, ...last.items].map((item) => item.id)).size,
    10,
  );
  for (const category of categories)
    assert.ok(
      searchPublicQuestions(all, { q: "", category: category.id, page: 1 })
        .total > 0,
    );
  assert.equal(
    searchPublicQuestions(all, {
      q: "REPORT",
      category: "mold-inspection",
      page: 1,
    }).total,
    1,
  );
  assert.equal(
    searchPublicQuestions(all, {
      q: "REPORT",
      category: "healthy-designers",
      page: 1,
    }).total,
    0,
  );
  assert.equal(
    (
      await demoQaRepository.search({
        q: "QA_UNPUBLISHED",
        category: "",
        page: 1,
      })
    ).total,
    0,
  );
});
test("direct adapter access hides private questions and only links eligible professional profiles", async () => {
  for (const id of [
    "pending-seed-question",
    "rejected-seed-question",
    "missing",
    "demo-session-question-1",
  ])
    assert.equal(await demoQaRepository.getPublicQuestion(id), null);
  const question = (await demoQaRepository.getPublicQuestion(
    "planning-inspection",
  ))!;
  assert.equal(
    question.answers[0].profileHref,
    "/professionals/demo-mold-inspection",
  );
  assert.ok(await demoDirectory.getPublicProfile("demo-mold-inspection"));
  assert.equal(question.answers[1].profileHref, undefined);
  const inactive =
    (await demoQaRepository.getPublicQuestion("design-handover"))!;
  assert.equal(inactive.answers[0].profileHref, undefined);
  assert.equal(
    (await demoQaRepository.getPublicQuestion("trade-visit"))!.answers.length,
    0,
  );
});
test("shared session creates pending questions with an explicit allowlist, never publishes, and resets coherently", () => {
  const seed = getDemoSessionSeed();
  const initial = createDemoSession(seed);
  const injected = {
    ...valid,
    id: "attacker",
    status: "published",
    moderationNote: "injected",
  };
  const submitted = reduceDemoSession(
    initial,
    { type: "submit-question", question: injected },
    seed,
  );
  assert.deepEqual(submitted.questions[0], {
    ...valid,
    id: "demo-session-question-1",
    status: "pending",
  });
  assert.deepEqual(submitted.records, initial.records);
  assert.equal(initial.questions.length, 0);
  assert.equal(
    reduceDemoSession(
      initial,
      { type: "submit-question", question: { ...valid, title: "bad" } },
      seed,
    ),
    initial,
  );
  const freshForm = reduceDemoSession(
    submitted,
    { type: "new-question" },
    seed,
  );
  assert.equal(freshForm.questionId, null);
  assert.equal(freshForm.questions.length, 1);
  const second = reduceDemoSession(
    freshForm,
    { type: "submit-question", question: valid },
    seed,
  );
  assert.equal(second.questions.length, 2);
  assert.notEqual(second.questions[0].id, second.questions[1].id);
  const reset = reduceDemoSession(second, { type: "reset" }, seed);
  assert.equal(reset.questions.length, 0);
  assert.equal(reset.questionId, null);
  assert.deepEqual(reset.records, initial.records);
});
