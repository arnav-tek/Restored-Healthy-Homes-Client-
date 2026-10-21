import { test } from "node:test";
import assert from "node:assert/strict";
import { categories } from "../../src/domain/categories";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import {
  createDemoSession,
  reduceDemoSession,
  memberFormFields,
  projectDemoPublic,
  type DemoMemberAction,
} from "../../src/domain/demo-member";
import { sessionCategories } from "../../src/domain/session-catalog";
import {
  parseNewCategory,
  parseCertification,
} from "../../src/validation/admin-editors";
import { projectCertification } from "../../src/domain/editorial";
import { parseApplication } from "../../src/validation/application";
import {
  parseQuestion,
  parseQaQuery,
  safeQaReturn,
} from "../../src/validation/qa";
import { parseConsultation } from "../../src/validation/consultation";
import { publishedSessionArticles } from "../../src/domain/admin-showcase";

function session(admin = true) {
  const seed = getDemoSessionSeed();
  let state = createDemoSession(seed);
  if (admin)
    state = reduceDemoSession(
      state,
      {
        type: "demo-sign-in",
        fields: { email: "admin@example.invalid", passcode: "home-access" },
      },
      seed,
    );
  return {
    get state() {
      return state;
    },
    act(action: DemoMemberAction) {
      state = reduceDemoSession(state, action, seed);
    },
  };
}
const newCategory = {
  name: "Indoor Air Planning",
  description: "A sample specialty for planning healthier indoor spaces.",
  monthlyUsd: 123,
};

test("category creation keeps IDs, prices and billing independent of names, records and canonical catalog", () => {
  const demo = session();
  const original = structuredClone(categories);
  const records = structuredClone(demo.state.records);
  demo.act({ type: "create-category", fields: newCategory });
  const created = demo.state.addedCategories[0];
  assert.match(created.id, /^demo-category-\d+$/);
  assert.ok(!created.id.includes("indoor"));
  assert.notEqual(created.billingKey, created.id);
  assert.ok(!created.billingKey.includes("indoor"));
  demo.act({
    type: "rename-category",
    id: created.id,
    name: "Air Quality Planning",
  });
  const renamed = sessionCategories(demo.state).find(
    (item) => item.id === created.id,
  )!;
  assert.equal(renamed.name, "Air Quality Planning");
  assert.equal(renamed.monthlyUsd, 123);
  assert.equal(renamed.billingKey, created.billingKey);
  assert.deepEqual(categories, original);
  assert.deepEqual(demo.state.records, records);
  const before = demo.state;
  demo.act({
    type: "create-category",
    fields: { ...newCategory, name: "air-quality-planning" },
  });
  assert.equal(demo.state, before);
  demo.act({ type: "reset" });
  assert.equal(demo.state.addedCategories.length, 0);
  assert.equal(sessionCategories(demo.state).length, 8);
});

test("new categories validate explicit amounts and fields, reject equivalent labels, and require an admin", () => {
  for (const monthlyUsd of [0, -1, 1.5, NaN, Infinity, 10001])
    assert.equal(
      parseNewCategory({ ...newCategory, monthlyUsd }, categories),
      null,
    );
  for (const fields of [
    { ...newCategory, monthlyUsd: "123" },
    { ...newCategory, name: "MOLD-remediation" },
    { ...newCategory, description: "short" },
    { ...newCategory, name: "<script>" },
  ])
    assert.equal(parseNewCategory(fields, categories), null);
  assert.ok(parseNewCategory(newCategory, categories));
  for (const account of [null, "approved"]) {
    const demo = session(false);
    if (account)
      demo.act({
        type: "demo-sign-in",
        fields: {
          email: `${account}@example.invalid`,
          passcode: "home-access",
        },
      });
    const before = demo.state;
    demo.act({ type: "create-category", fields: newCategory });
    assert.equal(demo.state, before);
  }
});

test("session catalog is validated through applications, Q&A and consultation requests without accepting unknown IDs", () => {
  const demo = session();
  demo.act({ type: "create-category", fields: newCategory });
  const id = demo.state.addedCategories[0].id;
  const catalog = sessionCategories(demo.state);
  const fields = memberFormFields(demo.state.records[0]);
  const raw = {
    ...fields,
    categoryIds: [id],
    services: fields.services.join("\n"),
    listedCredentials: fields.listedCredentials.join("\n"),
  };
  assert.equal(parseApplication(raw, categories).ok, false);
  assert.equal(parseApplication(raw, catalog).ok, true);
  demo.act({
    type: "edit",
    id: demo.state.records[0].id,
    profile: { ...fields, categoryIds: [id] },
  });
  assert.deepEqual(demo.state.records[0].profile.categoryIds, [id]);
  const question = {
    title: "Planning an indoor air project",
    categoryId: id,
    body: "What questions should we prepare for a planning conversation?",
  };
  assert.equal(parseQuestion(question).ok, false);
  demo.act({ type: "submit-question", question });
  assert.equal(demo.state.questions.at(-1)!.categoryId, id);
  assert.equal(parseQaQuery({ category: id }, catalog).query.category, id);
  assert.equal(
    safeQaReturn(`/questions?category=${id}`, catalog),
    `/questions?category=${id}`,
  );
  const request = {
    name: "Sample Visitor",
    email: "visitor@example.invalid",
    categoryId: id,
    format: "phone" as const,
    topic: "A planning conversation for a future indoor air project.",
  };
  assert.equal(parseConsultation(request).ok, false);
  demo.act({ type: "request-consultation", fields: request });
  assert.equal(demo.state.consultations.at(-1)!.categoryId, id);
  const before = demo.state;
  demo.act({
    type: "submit-question",
    question: { ...question, categoryId: "demo-category-999999" },
  });
  assert.equal(demo.state, before);
});

test("certification drafts publish by category without changing credential or eligibility decisions", () => {
  const demo = session();
  const original = structuredClone(demo.state.records);
  const entry = demo.state.certifications[0];
  assert.equal(projectCertification(entry), null);
  demo.act({
    type: "save-certification",
    categoryId: entry.categoryId,
    fields: { ...entry, providerName: "Sample Learning Program" },
  });
  assert.equal(demo.state.certifications.at(-1)!.status, "draft");
  demo.act({
    type: "publish-certification",
    categoryId: entry.categoryId,
    published: true,
  });
  const published = projectCertification(demo.state.certifications.at(-1)!)!;
  assert.equal(published.providerName, "Sample Learning Program");
  assert.ok(!("status" in published));
  assert.ok(!("categoryId" in published));
  published.steps.push("Injected step");
  assert.ok(!demo.state.certifications.at(-1)!.steps.includes("Injected step"));
  assert.deepEqual(demo.state.records, original);
  demo.act({
    type: "save-certification",
    categoryId: entry.categoryId,
    fields: { ...entry, providerName: "Edited Learning Program" },
  });
  assert.equal(demo.state.certifications.at(-1)!.status, "draft");
  const before = demo.state;
  demo.act({
    type: "save-certification",
    categoryId: "unknown",
    fields: entry,
  });
  assert.equal(demo.state, before);
  demo.act({ type: "reset" });
  assert.equal(demo.state.certifications[0].providerName, entry.providerName);
  assert.equal(demo.state.certifications[0].status, "draft");
});

test("certification fields reject unsafe links and malformed content; non-admins cannot publish", () => {
  const demo = session();
  const entry = demo.state.certifications[0];
  const raw = { ...entry, steps: entry.steps.join("\n") };
  assert.ok(parseCertification(raw));
  for (const providerUrl of [
    "javascript:alert(1)",
    "http://example.invalid",
    "https://user:pass@example.invalid",
    "not a url",
  ])
    assert.equal(parseCertification({ ...raw, providerUrl }), null);
  for (const changes of [
    { introduction: "short" },
    { steps: "x".repeat(301) },
    { kind: "Guaranteed license" },
    { requirements: "" },
    { costs: "x".repeat(701) },
  ])
    assert.equal(parseCertification({ ...raw, ...changes }), null);
  const anon = session(false);
  const before = anon.state;
  anon.act({
    type: "publish-certification",
    categoryId: entry.categoryId,
    published: true,
  });
  anon.act({
    type: "save-certification",
    categoryId: entry.categoryId,
    fields: entry,
  });
  assert.equal(anon.state, before);
});

test("public identity is explicit, validated and clearable; private contact details never become defaults", () => {
  const demo = session();
  const record = demo.state.records[0];
  assert.ok(!("publicDisplayName" in projectDemoPublic(record)));
  assert.ok(!("publicEmail" in projectDemoPublic(record)));
  const fields = {
    ...memberFormFields(record),
    name: "Private Owner",
    email: "private@example.invalid",
    publicDisplayName: "Public Specialist",
    publicEmail: "public@example.invalid",
  };
  demo.act({ type: "edit", id: record.id, profile: fields });
  const projected = projectDemoPublic(demo.state.records[0]);
  assert.equal(projected.publicDisplayName, "Public Specialist");
  assert.equal(projected.publicEmail, "public@example.invalid");
  assert.ok(!JSON.stringify(projected).includes("Private Owner"));
  assert.ok(!JSON.stringify(projected).includes("private@example.invalid"));
  demo.act({
    type: "edit",
    id: record.id,
    profile: { ...fields, publicDisplayName: "", publicEmail: "" },
  });
  assert.ok(!("publicEmail" in projectDemoPublic(demo.state.records[0])));
  const raw = {
    ...fields,
    services: fields.services.join("\n"),
    listedCredentials: fields.listedCredentials.join("\n"),
    publicEmail: "invalid",
  };
  assert.equal(parseApplication(raw, categories).ok, false);
});

test("published resource projection excludes draft bodies/status and cannot mutate saved articles", () => {
  const demo = session();
  const article = demo.state.articles[0];
  assert.equal(publishedSessionArticles(demo.state.articles).length, 0);
  demo.act({ type: "publish-article", id: article.id, published: true });
  const projected = publishedSessionArticles(demo.state.articles);
  assert.deepEqual(
    Object.keys(projected[0]).sort(),
    ["id", "title", "category", "summary", "body"].sort(),
  );
  Reflect.set(projected[0], "title", "Changed projection");
  assert.notEqual(demo.state.articles[0].title, "Changed projection");
  demo.act({ type: "publish-article", id: article.id, published: false });
  assert.equal(publishedSessionArticles(demo.state.articles).length, 0);
});
