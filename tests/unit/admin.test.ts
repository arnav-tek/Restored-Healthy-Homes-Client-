import { test } from "node:test";
import assert from "node:assert/strict";
import { categories } from "../../src/domain/categories";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import {
  createDemoSession,
  reduceDemoSession,
  memberFormFields,
  demoPublicDirectory,
  projectDemoPublic,
  filterDemoRecords,
  type DemoMemberAction,
} from "../../src/domain/demo-member";
import { isPubliclyEligible } from "../../src/domain/listing";
import {
  parseCategoryName,
  parseReviewReason,
} from "../../src/validation/admin";

function session() {
  const seed = getDemoSessionSeed();
  let state = createDemoSession(seed);
  return {
    get state() {
      return state;
    },
    act(action: DemoMemberAction) {
      state = reduceDemoSession(state, action, seed);
      return state;
    },
  };
}
test("application decisions stay coherent, never activate subscriptions and survive member edits", () => {
  const demo = session();
  demo.act({
    type: "submit",
    profile: memberFormFields(demo.state.records[0]),
  });
  const id = demo.state.applicationId!;
  demo.act({
    type: "decide",
    id,
    approval: "approved",
    reason: "Sample accepted",
  });
  let record = demo.state.records.find((item) => item.id === id)!;
  assert.equal(record.approval, "approved");
  assert.equal(record.subscription, "inactive");
  assert.equal(isPubliclyEligible(record), false);
  demo.act({
    type: "decide",
    id,
    approval: "rejected",
    reason: "More sample details needed",
  });
  demo.act({
    type: "edit",
    id,
    profile: { ...memberFormFields(record), businessName: "Edited locally" },
  });
  record = demo.state.records.find((item) => item.id === id)!;
  assert.equal(record.approval, "rejected");
  assert.equal(record.decisionReason, "More sample details needed");
  assert.equal(record.subscription, "inactive");
  assert.equal(demo.state.applicationId, id);
});
test("suspension overrides active eligibility and reinstatement respects inactive subscriptions", () => {
  const demo = session();
  for (const id of ["member-example-approved", "member-example-inactive"]) {
    demo.act({
      type: "suspend",
      id,
      suspended: true,
      reason: "Sample suspension",
    });
    assert.equal(
      isPubliclyEligible(demo.state.records.find((item) => item.id === id)!),
      false,
    );
    demo.act({
      type: "decide",
      id,
      approval: "approved",
      reason: "Review approved again",
    });
    assert.equal(
      demo.state.records.find((item) => item.id === id)!.suspended,
      true,
    );
    demo.act({
      type: "suspend",
      id,
      suspended: false,
      reason: "Sample reinstatement",
    });
    assert.equal(
      isPubliclyEligible(demo.state.records.find((item) => item.id === id)!),
      id === "member-example-approved",
    );
  }
  const before = demo.state;
  demo.act({
    type: "suspend",
    id: "member-example-pending",
    suspended: true,
    reason: "Not approved",
  });
  assert.equal(demo.state, before);
});
test("credential identity follows unchanged claims, never new, edited, duplicate or re-added claims", () => {
  const demo = session();
  const id = demo.state.records[0].id;
  const first = demo.state.records[0].credentials[0];
  demo.act({
    type: "credential",
    id,
    credentialId: first.id,
    verification: "verified",
  });
  const profile = memberFormFields(demo.state.records[0]);
  demo.act({
    type: "edit",
    id,
    profile: { ...profile, listedCredentials: ["Another claim", first.text] },
  });
  assert.deepEqual(
    demo.state.records[0].credentials.map((item) => item.verification),
    ["unverified", "verified"],
  );
  assert.equal(demo.state.records[0].credentials[1].id, first.id);
  demo.act({
    type: "edit",
    id,
    profile: { ...profile, listedCredentials: [first.text, first.text] },
  });
  assert.deepEqual(
    demo.state.records[0].credentials.map((item) => item.verification),
    ["verified", "unverified"],
  );
  demo.act({
    type: "credential",
    id,
    credentialId: first.id,
    verification: "unverified",
  });
  assert.equal(demo.state.records[0].credentials[0].verification, "unverified");
  demo.act({
    type: "credential",
    id,
    credentialId: first.id,
    verification: "verified",
  });
  demo.act({
    type: "edit",
    id,
    profile: { ...profile, listedCredentials: ["Changed claim"] },
  });
  assert.equal(demo.state.records[0].credentials[0].verification, "unverified");
  assert.notEqual(demo.state.records[0].credentials[0].id, first.id);
  demo.act({ type: "edit", id, profile });
  assert.equal(demo.state.records[0].credentials[0].verification, "unverified");
  assert.notEqual(demo.state.records[0].credentials[0].id, first.id);
  const before = demo.state;
  demo.act({
    type: "credential",
    id,
    credentialId: first.id,
    verification: "verified",
  });
  assert.equal(demo.state, before);
});
test("category names validate and renaming preserves constants, IDs, prices, billing and memberships", () => {
  const demo = session();
  const original = structuredClone(categories);
  const records = structuredClone(demo.state.records);
  const id = "healthy-designers";
  for (const value of [
    null,
    {},
    "",
    "  ",
    "ab",
    "x".repeat(81),
    "MOLD-remediation",
    "Mold　Remediation",
    "<script>",
    "bad\u200bname",
    "---",
  ])
    assert.equal(parseCategoryName(value, id, categories), null);
  assert.equal(parseCategoryName("New label", "missing", categories), null);
  demo.act({ type: "rename-category", id, name: "  Thoughtful   Design  " });
  assert.equal(demo.state.categoryNames[id], "Thoughtful Design");
  assert.deepEqual(categories, original);
  assert.deepEqual(demo.state.records, records);
  demo.act({
    type: "rename-category",
    id: "healthy-trades",
    name: "thoughtful-design",
  });
  assert.equal(
    demo.state.categoryNames["healthy-trades"],
    "Healthy Home Trades",
  );
});
test("public session projection excludes private fields, filters eligibility first and copies nested data", () => {
  const demo = session();
  const record = demo.state.records[0];
  const publicRecords = demoPublicDirectory(demo.state.records);
  assert.deepEqual(
    publicRecords.map((item) => item.id),
    [
      record.id,
      "member-example-coordinator",
      "member-example-fern",
      "member-example-cedar",
    ],
  );
  assert.deepEqual(
    Object.keys(publicRecords[0]).sort(),
    [
      "id",
      "businessName",
      "categoryIds",
      "city",
      "state",
      "description",
      "practices",
      "services",
      "credentials",
      "phone",
      "website",
    ].sort(),
  );
  for (const privateValue of [
    record.profile.email,
    record.profile.name,
    record.decisionReason,
  ])
    assert.ok(!JSON.stringify(publicRecords).includes(privateValue));
  publicRecords[0].categoryIds.push("injected");
  publicRecords[0].credentials.length = 0;
  assert.equal(record.credentials.length, 1);
  assert.equal(record.profile.categoryIds.length, 1);
  assert.ok(!("approval" in projectDemoPublic(record)));
  demo.act({
    type: "decide",
    id: record.id,
    approval: "rejected",
    reason: "Rejected sample",
  });
  assert.equal(demoPublicDirectory(demo.state.records).length, 3);
});
test("admin filters, validation and reset have no competing state", () => {
  const demo = session();
  const original = structuredClone(demo.state);
  assert.equal(
    filterDemoRecords(demo.state.records, {
      query: " MEADOW ",
      approval: "approved",
      suspension: "clear",
    }).length,
    1,
  );
  assert.equal(
    filterDemoRecords(demo.state.records, {
      query: "",
      approval: "pending",
      suspension: "all",
    }).length,
    1,
  );
  assert.equal(
    filterDemoRecords(demo.state.records, {
      query: "unknown",
      approval: "all",
      suspension: "all",
    }).length,
    0,
  );
  for (const reason of [null, {}, "", "ab", "a".repeat(301)])
    assert.equal(parseReviewReason(reason), null);
  assert.equal(parseReviewReason(" Sample reason "), "Sample reason");
  demo.act({
    type: "decide",
    id: original.selectedId,
    approval: "rejected",
    reason: "",
  });
  assert.deepEqual(demo.state, original);
  demo.act({
    type: "suspend",
    id: original.selectedId,
    suspended: true,
    reason: "Sample suspension",
  });
  assert.equal(
    filterDemoRecords(demo.state.records, {
      query: "",
      approval: "all",
      suspension: "suspended",
    }).length,
    1,
  );
  demo.act({
    type: "credential",
    id: original.selectedId,
    credentialId: original.records[0].credentials[0].id,
    verification: "verified",
  });
  demo.act({
    type: "rename-category",
    id: categories[0].id,
    name: "New Sample Name",
  });
  demo.act({ type: "reset" });
  assert.deepEqual(demo.state.records, original.records);
  assert.deepEqual(demo.state.categoryNames, original.categoryNames);
  assert.deepEqual(demo.state.inquiries, original.inquiries);
  assert.deepEqual(session().state, original);
});
