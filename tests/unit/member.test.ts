import { test } from "node:test";
import assert from "node:assert/strict";
import { categories } from "../../src/domain/categories";
import {
  parseApplication,
  applicationLimits,
} from "../../src/validation/application";
import {
  createDemoSession,
  reduceDemoSession,
} from "../../src/domain/demo-member";
import { isPubliclyEligible } from "../../src/domain/listing";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import { demoDirectory } from "../../src/data/demo/repository";

const raw = {
  name: " Sample Owner ",
  businessName: "Fictional Local Studio",
  email: "sample@example.invalid",
  phone: "",
  website: "",
  city: "Raleigh",
  state: "nc",
  categoryIds: ["healthy-designers", "healthy-trades"],
  services: "Sample design\nSample planning",
  description: "A fictional business description for local testing.",
  practices: "Sample ventilation and moisture-aware material choices.",
  listedCredentials: "Sample course",
};
function validProfile() {
  const result = parseApplication(raw, categories);
  assert.ok(result.ok);
  return result.profile;
}
test("application validation normalizes permitted fields and accepts stable IDs independently of catalog order", () => {
  const normal = parseApplication(
    { ...raw, approval: "approved", id: "injected", subscription: "active" },
    [...categories].reverse(),
  );
  assert.ok(normal.ok);
  assert.deepEqual(normal.profile, validProfile());
  assert.equal(normal.profile.name, "Sample Owner");
  assert.equal(normal.profile.state, "NC");
  assert.deepEqual(normal.profile.services, [
    "Sample design",
    "Sample planning",
  ]);
  assert.ok(!("approval" in normal.profile));
  assert.ok(!("id" in normal.profile));
  assert.ok(!("subscription" in normal.profile));
});
test("application validation rejects missing, mistyped, oversized, malformed and repeated data", () => {
  for (const field of Object.keys(
    applicationLimits,
  ) as (keyof typeof applicationLimits)[]) {
    for (const value of [
      null,
      {},
      [],
      42,
      "x".repeat(applicationLimits[field] + 1),
    ]) {
      const result = parseApplication({ ...raw, [field]: value }, categories);
      assert.ok(!result.ok && result.errors[field], field);
    }
  }
  for (const categoryIds of [
    [],
    ["unknown"],
    ["Mold Remediation"],
    ["healthy-trades", "healthy-trades"],
    [123],
    "healthy-trades",
  ])
    assert.equal(
      parseApplication({ ...raw, categoryIds }, categories).ok,
      false,
    );
  for (const website of [
    "javascript:alert(1)",
    "ftp://sample.invalid",
    "https://name:password@sample.invalid",
    "not-a-url",
  ])
    assert.equal(parseApplication({ ...raw, website }, categories).ok, false);
  for (const phone of ["-------", "123", "call-me", "1234567890123456"])
    assert.equal(parseApplication({ ...raw, phone }, categories).ok, false);
  for (const email of [
    "missing-at",
    "two@@sample.invalid",
    "a b@sample.invalid",
  ])
    assert.equal(parseApplication({ ...raw, email }, categories).ok, false);
  for (const values of [
    { description: "short" },
    { practices: "short" },
    { state: "1!" },
    { services: " " },
    { listedCredentials: "a".repeat(121) },
    { services: Array(13).fill("service").join("\n") },
  ])
    assert.equal(parseApplication({ ...raw, ...values }, categories).ok, false);
  assert.equal(
    parseApplication(
      {
        ...raw,
        name: "n".repeat(80),
        businessName: "b".repeat(120),
        description: "d".repeat(2000),
        practices: "p".repeat(1500),
        website: "https://sample.example.invalid",
        phone: "+1 (202) 555-0100",
        listedCredentials: "",
      },
      categories,
    ).ok,
    true,
  );
});
test("applications enter pending/inactive state with unverified credentials and no directory publication", async () => {
  const seed = getDemoSessionSeed();
  const profile = {
    ...validProfile(),
    approval: "approved",
    subscription: "active",
    id: "injected",
    verifiedCredentials: ["Fake verification"],
  };
  const next = reduceDemoSession(
    createDemoSession(seed),
    { type: "submit", profile },
    seed,
  );
  const application = next.records.find(
    (record) => record.id === next.applicationId,
  )!;
  assert.equal(application.id, "demo-local-application");
  assert.equal(application.approval, "pending");
  assert.equal(application.subscription, "inactive");
  assert.equal(application.suspended, false);
  assert.equal(application.featuredEntitlement, "none");
  assert.deepEqual(
    application.credentials.map(({ text, verification }) => ({
      text,
      verification,
    })),
    [{ text: "Sample course", verification: "unverified" }],
  );
  assert.equal(isPubliclyEligible(application), false);
  assert.equal(next.selectedId, application.id);
  assert.deepEqual(next.inquiries, seed.inquiries);
  assert.ok(
    !(await demoDirectory.listPublic()).some(
      (record) => record.businessName === application.profile.businessName,
    ),
  );
});
test("member edits copy only permitted fields and preserve protected decisions and identity", () => {
  const seed = getDemoSessionSeed();
  const current = createDemoSession(seed);
  const record = {
    ...current.records[0],
    decisionReason: "Protected decision reason",
    suspended: true,
    featuredEntitlement: "active" as const,
  };
  const state = { ...current, records: [record, ...current.records.slice(1)] };
  const edited = {
    ...validProfile(),
    id: "injected",
    approval: "rejected",
    subscription: "canceled",
    suspended: false,
    featuredEntitlement: "none",
    verifiedCredentials: ["Injected"],
    listedCredentials: ["New sample credential"],
  };
  const next = reduceDemoSession(
    state,
    { type: "edit", id: record.id, profile: edited },
    seed,
  );
  const after = next.records[0];
  assert.deepEqual(
    { ...after, profile: record.profile, credentials: record.credentials },
    record,
  );
  assert.deepEqual(
    after.credentials.map((claim) => claim.text),
    ["New sample credential"],
  );
  edited.categoryIds.push("injected");
  assert.ok(!after.profile.categoryIds.includes("injected"));
  assert.ok(!("verifiedCredentials" in after.profile));
  assert.equal(isPubliclyEligible(after), false);
  assert.equal(
    isPubliclyEligible({
      ...after,
      suspended: false,
      subscription: "inactive",
    }),
    false,
  );
  assert.equal(isPubliclyEligible({ ...after, suspended: false }), true);
});
test("session selection, edits and reset are coherent, isolated and leave inbox seeds unchanged", () => {
  const seed = getDemoSessionSeed();
  const initial = createDemoSession(seed);
  const submitted = reduceDemoSession(
    initial,
    { type: "submit", profile: validProfile() },
    seed,
  );
  const selected = reduceDemoSession(
    submitted,
    { type: "select", id: "member-example-rejected" },
    seed,
  );
  assert.equal(selected.applicationId, submitted.applicationId);
  assert.equal(selected.records.length, 5);
  assert.equal(
    reduceDemoSession(selected, { type: "select", id: "unknown" }, seed),
    selected,
  );
  assert.equal(
    reduceDemoSession(
      selected,
      { type: "edit", id: "unknown", profile: validProfile() },
      seed,
    ),
    selected,
  );
  const reset = reduceDemoSession(selected, { type: "reset" }, seed);
  assert.deepEqual(reset.records, initial.records);
  assert.deepEqual(reset.inquiries, initial.inquiries);
  assert.equal(reset.applicationId, null);
  assert.equal(reset.selectedId, initial.selectedId);
  assert.ok(reset.revision > selected.revision);
  assert.equal(createDemoSession(seed).applicationId, null);
  assert.equal(seed.records.length, 4);
});
