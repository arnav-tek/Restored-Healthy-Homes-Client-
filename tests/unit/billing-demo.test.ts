import { test } from "node:test";
import assert from "node:assert/strict";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import {
  createDemoSession,
  memberFormFields,
  reduceDemoSession,
  type DemoMemberAction,
} from "../../src/domain/demo-member";
import { canStartBilling } from "../../src/domain/billing-demo";
import { publicFeaturedExamples } from "../../src/domain/public-featured";
import { publicApplicationProfile } from "../../src/domain/public-application";
import { membershipStatuses } from "../../src/domain/admin-showcase";

function demo(account = "inactive") {
  const seed = getDemoSessionSeed();
  let state = createDemoSession(seed);
  const act = (action: DemoMemberAction) =>
    (state = reduceDemoSession(state, action, seed));
  const signIn = (name: string) => {
    act({ type: "demo-sign-out" });
    act({
      type: "demo-sign-in",
      fields: { email: `${name}@example.invalid`, passcode: "home-access" },
    });
  };
  signIn(account);
  const id = `member-example-${account}`;
  return {
    get state() {
      return state;
    },
    act,
    signIn,
    id,
    record: () => state.records.find((record) => record.id === id)!,
    attempt: () => state.billing.find((attempt) => attempt.memberId === id)!,
    start: (
      kind: "checkout" | "renewal" | "cancel" | "recovery",
      categoryId = "healthy-designers",
    ) => act({ type: "billing-start", id, kind, categoryId }),
    result: (outcome: "success" | "failure") =>
      act({
        type: "billing-result",
        id,
        attemptId: state.billing.find((attempt) => attempt.memberId === id)!
          .attemptId,
        outcome,
      }),
  };
}

test("checkout review, abort, success, cancellation review/back/confirmation and restart are guarded", () => {
  const d = demo();
  const initial = d.record();
  d.start("checkout");
  assert.equal(d.record(), initial);
  assert.equal(d.attempt().monthlyUsd, 129);
  assert.equal(d.attempt().billingKey, "membership-designers");
  const reviewing = d.state;
  d.start("checkout");
  assert.equal(d.state, reviewing);
  d.act({ type: "billing-close", id: d.id });
  assert.equal(d.state.billing.length, 0);
  assert.equal(d.record().subscription, "inactive");
  d.start("checkout");
  const oldAttempt = d.attempt().attemptId;
  d.result("success");
  assert.equal(d.record().subscription, "active");
  assert.deepEqual(
    { ...d.record(), subscription: initial.subscription },
    initial,
  );
  const completed = d.state;
  d.act({
    type: "billing-result",
    id: d.id,
    attemptId: oldAttempt,
    outcome: "failure",
  });
  assert.equal(d.state, completed);
  d.start("cancel");
  assert.equal(d.record().subscription, "active");
  d.act({ type: "billing-close", id: d.id });
  assert.equal(d.record().subscription, "active");
  d.start("cancel");
  d.act({ type: "billing-cancel", id: d.id, attemptId: d.attempt().attemptId });
  assert.equal(d.record().subscription, "canceled");
  const canceled = d.state;
  d.act({ type: "billing-cancel", id: d.id, attemptId: d.attempt().attemptId });
  assert.equal(d.state, canceled);
  d.start("checkout");
  d.result("success");
  assert.equal(d.record().subscription, "active");
});

test("failed checkout/renewal and repeated recovery failures lead to an explicit successful retry", () => {
  const d = demo();
  d.start("checkout");
  d.result("failure");
  assert.equal(d.record().subscription, "past_due");
  assert.equal(d.attempt().stage, "failed");
  d.start("recovery");
  d.result("failure");
  assert.equal(d.record().subscription, "past_due");
  d.start("recovery");
  d.result("success");
  assert.equal(d.record().subscription, "active");
  d.start("renewal");
  d.result("failure");
  assert.equal(d.record().subscription, "past_due");
  d.start("cancel");
  d.act({ type: "billing-cancel", id: d.id, attemptId: d.attempt().attemptId });
  assert.equal(d.record().subscription, "canceled");
});

test("billing rejects anonymous/admin/other-member commands, bad categories/outcomes and stale attempts", () => {
  const d = demo();
  for (const account of ["admin", "approved", "pending"]) {
    d.signIn(account);
    const before = d.state;
    d.start("checkout");
    assert.equal(d.state, before);
  }
  d.act({ type: "demo-sign-out" });
  const anonymous = d.state;
  d.start("checkout");
  assert.equal(d.state, anonymous);
  d.signIn("inactive");
  for (const categoryId of [
    "healthy-builders",
    "membership-designers",
    "missing",
    "<script>",
  ]) {
    const before = d.state;
    d.start("checkout", categoryId);
    assert.equal(d.state, before);
  }
  d.start("checkout");
  const before = d.state;
  d.act({
    type: "billing-result",
    id: d.id,
    attemptId: d.attempt().attemptId + 1,
    outcome: "success",
  });
  d.act({ type: "billing-cancel", id: d.id, attemptId: d.attempt().attemptId });
  d.act({
    type: "billing-result",
    id: d.id,
    attemptId: d.attempt().attemptId,
    outcome: "forged" as "success",
  });
  assert.equal(d.state, before);
  d.act({ type: "edit", id: d.id, profile: memberFormFields(d.record()) });
  assert.equal(d.state.billing.length, 0);
  d.act({
    type: "billing-result",
    id: d.id,
    attemptId: before.billing[0].attemptId,
    outcome: "success",
  });
  assert.equal(d.record().subscription, "inactive");
});

test("membership status matrix has only the intended demo entry points", () => {
  for (const status of membershipStatuses) {
    assert.equal(
      canStartBilling("checkout", status),
      ["inactive", "canceled", "trialing"].includes(status),
    );
    assert.equal(canStartBilling("renewal", status), status === "active");
    assert.equal(
      canStartBilling("recovery", status),
      ["past_due", "unpaid"].includes(status),
    );
    assert.equal(
      canStartBilling("cancel", status),
      ["active", "past_due", "unpaid", "trialing"].includes(status),
    );
  }
  assert.equal(canStartBilling("injected" as "checkout", "inactive"), false);
});

test("demo success cannot clear rejection/suspension or grant featured/certification; reset and sign-out isolate reviews", () => {
  const d = demo("rejected");
  const original = d.record();
  d.start("checkout");
  d.result("success");
  assert.equal(d.record().approval, "rejected");
  assert.equal(d.record().featuredEntitlement, original.featuredEntitlement);
  assert.deepEqual(d.record().credentials, original.credentials);
  d.signIn("admin");
  d.act({
    type: "decide",
    id: d.id,
    approval: "approved",
    reason: "Approve sample",
  });
  d.act({
    type: "suspend",
    id: d.id,
    suspended: true,
    reason: "Suspend sample",
  });
  d.signIn("rejected");
  d.start("renewal");
  d.result("success");
  assert.equal(d.record().suspended, true);
  d.act({ type: "demo-sign-out" });
  assert.equal(d.record().subscription, "active");
  assert.equal(d.attempt().stage, "active");
  d.signIn("rejected");
  d.start("cancel");
  d.act({ type: "demo-sign-out" });
  assert.equal(d.state.billing.length, 0);
  d.act({ type: "reset" });
  assert.equal(d.state.billing.length, 0);
  assert.equal(d.record().subscription, "inactive");
});

test("immutable category mapping controls reference price after rename and custom categories remain explicit previews", () => {
  const d = demo();
  d.signIn("admin");
  d.act({
    type: "rename-category",
    id: "healthy-designers",
    name: "New specialty label",
  });
  d.signIn("inactive");
  d.start("checkout");
  assert.equal(d.attempt().monthlyUsd, 129);
  assert.equal(d.attempt().billingKey, "membership-designers");
  d.act({ type: "billing-close", id: d.id });
  d.signIn("admin");
  d.act({
    type: "create-category",
    fields: {
      name: "Sample specialty",
      description: "A fictional extra specialty for the demonstration.",
      monthlyUsd: 42,
    },
  });
  const category = d.state.addedCategories[0];
  d.act({
    type: "edit",
    id: d.id,
    profile: {
      ...memberFormFields(d.record()),
      categoryIds: ["healthy-designers", category.id],
    },
  });
  d.signIn("inactive");
  d.start("checkout", category.id);
  assert.equal(d.attempt().monthlyUsd, 42);
  assert.equal(d.attempt().categoryId, category.id);
  assert.equal(d.attempt().billingKey, category.billingKey);
  d.result("success");
  assert.deepEqual(d.record().profile.categoryIds, [
    "healthy-designers",
    category.id,
  ]);
});

test("application checkout/failure/recovery/cancellation drive public publication without granting featured status", () => {
  const d = demo();
  d.act({ type: "demo-sign-out" });
  d.act({ type: "submit", profile: memberFormFields(d.record()) });
  const id = d.state.applicationId!;
  d.signIn("admin");
  d.act({ type: "decide", id, approval: "approved", reason: "Approve sample" });
  d.act({ type: "set-featured", id, enabled: true, reason: "Feature sample" });
  d.signIn("application");
  const start = (kind: "checkout" | "renewal" | "cancel" | "recovery") =>
    d.act({ type: "billing-start", id, categoryId: "healthy-designers", kind });
  const result = (outcome: "success" | "failure") =>
    d.act({
      type: "billing-result",
      id,
      attemptId: d.state.billing[0].attemptId,
      outcome,
    });
  assert.equal(publicApplicationProfile(d.state), null);
  start("checkout");
  result("success");
  assert.ok(publicApplicationProfile(d.state));
  assert.equal(publicFeaturedExamples([], [], d.state).length, 1);
  start("renewal");
  result("failure");
  assert.equal(publicApplicationProfile(d.state), null);
  assert.equal(publicFeaturedExamples([], [], d.state).length, 0);
  start("recovery");
  result("success");
  assert.equal(publicFeaturedExamples([], [], d.state).length, 1);
  start("cancel");
  d.act({
    type: "billing-cancel",
    id,
    attemptId: d.state.billing[0].attemptId,
  });
  assert.equal(publicFeaturedExamples([], [], d.state).length, 0);
});
