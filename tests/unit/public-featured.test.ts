import { test } from "node:test";
import assert from "node:assert/strict";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import {
  createDemoSession,
  memberFormFields,
  reduceDemoSession,
} from "../../src/domain/demo-member";
import {
  publicFeaturedExamples,
  hasPublicFeaturedLink,
} from "../../src/domain/public-featured";
import { demoDirectory } from "../../src/data/demo/repository";

process.env.RHH_APP_MODE = "demo";
test("homepage baseline, linked entitlement changes and fixed public catalog order", async () => {
  const seed = getDemoSessionSeed();
  let state = createDemoSession(seed);
  const listings = await demoDirectory.listPublic();
  const ids = (await demoDirectory.listFeaturedPublic()).map(({ id }) => id);
  const shown = () =>
    publicFeaturedExamples(listings, ids, state).map(({ id }) => id);
  assert.deepEqual(shown(), ids);
  state = reduceDemoSession(
    state,
    {
      type: "demo-sign-in",
      fields: { email: "admin@example.invalid", passcode: "home-access" },
    },
    seed,
  );
  state = reduceDemoSession(
    state,
    {
      type: "set-featured",
      id: "member-example-fern",
      enabled: false,
      reason: "Remove example",
    },
    seed,
  );
  assert.deepEqual(shown(), ["demo-healthy-designers"]);
  state = reduceDemoSession(
    state,
    {
      type: "set-featured",
      id: "member-example-cedar",
      enabled: true,
      reason: "Add example",
    },
    seed,
  );
  assert.deepEqual(shown(), [
    "demo-mold-remediation",
    "demo-healthy-designers",
  ]);
  state = reduceDemoSession(
    state,
    {
      type: "suspend",
      id: "member-example-cedar",
      suspended: true,
      reason: "Suspend example",
    },
    seed,
  );
  assert.deepEqual(shown(), ["demo-healthy-designers"]);
  assert.equal(
    state.records.find(({ id }) => id === "member-example-cedar")
      ?.featuredEntitlement,
    "active",
  );
  assert.equal(hasPublicFeaturedLink("member-example-approved"), false);
  assert.equal(hasPublicFeaturedLink("member-example-fern"), true);
});

test("application featured cards require every eligibility condition and only expose card fields", () => {
  const seed = getDemoSessionSeed();
  let state = createDemoSession(seed);
  state = reduceDemoSession(
    state,
    { type: "submit", profile: memberFormFields(seed.records[0]) },
    seed,
  );
  const id = state.applicationId!;
  state = reduceDemoSession(
    state,
    {
      type: "demo-sign-in",
      fields: { email: "admin@example.invalid", passcode: "home-access" },
    },
    seed,
  );
  state = reduceDemoSession(
    state,
    { type: "set-featured", id, enabled: true, reason: "Feature example" },
    seed,
  );
  const shown = () => publicFeaturedExamples([], [], state);
  assert.equal(shown().length, 0);
  state = reduceDemoSession(
    state,
    {
      type: "simulate-membership",
      id,
      status: "active",
      reason: "Payment example",
    },
    seed,
  );
  assert.equal(shown().length, 0);
  state = reduceDemoSession(
    state,
    { type: "decide", id, approval: "approved", reason: "Approve example" },
    seed,
  );
  assert.equal(shown().length, 1);
  for (const field of [
    "profile",
    "email",
    "name",
    "contact",
    "decisionReason",
    "subscription",
    "featuredEntitlement",
    "billing",
  ])
    assert.ok(!(field in shown()[0]));
  for (const subscription of [
    "inactive",
    "past_due",
    "canceled",
    "trialing",
    "unpaid",
  ] as const) {
    state = {
      ...state,
      records: state.records.map((record) =>
        record.id === id ? { ...record, subscription } : record,
      ),
    };
    assert.equal(shown().length, 0);
  }
  state = {
    ...state,
    records: state.records.map((record) =>
      record.id === id
        ? { ...record, subscription: "active", approval: "rejected" }
        : record,
    ),
  };
  assert.equal(shown().length, 0);
  state = reduceDemoSession(state, { type: "reset" }, seed);
  assert.equal(shown().length, 0);
});
