import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demoAccounts,
  demoPasscode,
  type DemoIdentity,
} from "../../src/domain/demo-identity";
import {
  parseDemoSignIn,
  safeDemoReturn,
} from "../../src/validation/demo-sign-in";
import {
  createDemoSession,
  reduceDemoSession,
  memberFormFields,
  demoPublicDirectory,
  type DemoMemberAction,
} from "../../src/domain/demo-member";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
const seed = getDemoSessionSeed();
const credentials = {
  email: "approved@example.invalid",
  passcode: demoPasscode,
};
test("demo sign-in validates only known fictional presets and bounded fields, never form roles or member IDs", () => {
  for (const account of demoAccounts(null)) {
    assert.deepEqual(
      parseDemoSignIn(
        {
          email: ` ${account.email.toUpperCase()} `,
          passcode: demoPasscode,
          role: "admin",
          memberId: "forged",
        },
        null,
      ),
      { ok: true, identity: account.identity },
    );
  }
  for (const email of [
    null,
    [],
    {},
    1,
    "",
    "unknown@example.invalid",
    "real@example.com",
    "x".repeat(255),
  ])
    assert.equal(parseDemoSignIn({ ...credentials, email }, null).ok, false);
  for (const passcode of [
    null,
    [],
    1,
    "",
    "wrong",
    "home-demo ",
    "x".repeat(65),
  ])
    assert.equal(parseDemoSignIn({ ...credentials, passcode }, null).ok, false);
  assert.equal(
    parseDemoSignIn(
      { email: "application@example.invalid", passcode: demoPasscode },
      null,
    ).ok,
    false,
  );
  assert.equal(
    parseDemoSignIn(
      { email: "application@example.invalid", passcode: demoPasscode },
      "demo-local-application",
    ).ok,
    true,
  );
  assert.equal(demoAccounts(null).length, 8);
});
test("identity is an explicit session selection; switching requires sign-out and does not change eligibility", () => {
  let state = createDemoSession(seed);
  const start = state;
  const act = (action: DemoMemberAction) =>
    (state = reduceDemoSession(state, action, seed));
  assert.equal(state.identity, null);
  assert.equal(
    act({
      type: "demo-sign-in",
      fields: { ...credentials, passcode: "wrong" },
    }),
    start,
  );
  for (const account of demoAccounts(null)) {
    act({
      type: "demo-sign-in",
      fields: { email: account.email, passcode: demoPasscode },
    });
    assert.deepEqual(state.identity, account.identity);
    assert.equal(state.records, start.records);
    assert.deepEqual(
      demoPublicDirectory(state.records),
      demoPublicDirectory(start.records),
    );
    if (account.identity.kind === "member")
      assert.equal(state.selectedId, account.identity.memberId);
    const before = state;
    assert.equal(act({ type: "demo-sign-in", fields: credentials }), before);
    act({ type: "demo-sign-out" });
    assert.equal(state.identity, null);
  }
  assert.ok(!("passcode" in state));
  assert.ok(!("email" in state));
});
test("sign-out retains submitted workflow records; reset and fresh sessions clear identity and workflows", () => {
  let state = createDemoSession(seed);
  state = reduceDemoSession(
    state,
    {
      type: "request-consultation",
      fields: {
        name: "Sample Visitor",
        email: "visitor@example.invalid",
        categoryId: "healthy-designers",
        format: "phone",
        topic: "A fictional sample project for coordination.",
      },
    },
    seed,
  );
  state = reduceDemoSession(
    state,
    {
      type: "demo-sign-in",
      fields: { email: "admin@example.invalid", passcode: demoPasscode },
    },
    seed,
  );
  state = reduceDemoSession(
    state,
    {
      type: "assign-consultation",
      id: state.consultationId!,
      providerId: "member-example-approved",
    },
    seed,
  );
  const before = state;
  state = reduceDemoSession(state, { type: "demo-sign-out" }, seed);
  for (const key of [
    "consultations",
    "records",
    "questions",
    "qa",
    "inquiries",
  ] as const)
    assert.equal(state[key], before[key]);
  state = reduceDemoSession(
    state,
    { type: "demo-sign-in", fields: credentials },
    seed,
  );
  state = reduceDemoSession(
    state,
    { type: "accept-consultation", id: state.consultationId! },
    seed,
  );
  assert.equal(state.consultations[0].status, "accepted");
  state = reduceDemoSession(state, { type: "reset" }, seed);
  assert.equal(state.identity, null);
  assert.equal(state.consultations.length, 0);
  assert.deepEqual(state.records, seed.records);
  assert.equal(createDemoSession(seed).identity, null);
});
test("a public application neither creates an identity nor changes the signed-in professional", () => {
  let state = createDemoSession(seed);
  const profile = memberFormFields(seed.records[0]);
  state = reduceDemoSession(state, { type: "submit", profile }, seed);
  assert.equal(state.identity, null);
  state = reduceDemoSession(
    state,
    { type: "demo-sign-in", fields: credentials },
    seed,
  );
  const identity = state.identity;
  state = reduceDemoSession(
    state,
    { type: "submit", profile: { ...profile, businessName: "Another sample" } },
    seed,
  );
  assert.equal(state.identity, identity);
  assert.equal(state.selectedId, "member-example-approved");
  assert.equal(
    state.records.find((record) => record.id === state.applicationId)?.approval,
    "pending",
  );
});
test("safe returns allow only canonical account dashboards and reject external, malformed and duplicate destinations", () => {
  const member: DemoIdentity = {
    kind: "member",
    accountId: "approved",
    memberId: "member-example-approved",
  };
  const admin: DemoIdentity = { kind: "admin", accountId: "admin" };
  for (const identity of [member, admin])
    for (const value of [
      undefined,
      [],
      "https://evil.invalid",
      "//evil.invalid",
      "/\\evil.invalid",
      "/login",
      "/directory",
      `/demo/${identity.kind}/../admin`,
      `/demo/${identity.kind}?section=profile&section=overview`,
      `/demo/${identity.kind}?next=https://evil.invalid`,
      `/demo/${identity.kind}#fragment`,
      `/demo/${identity.kind}?q=%0a`,
      `/demo/${identity.kind}?q=%ZZ`,
      "x".repeat(1001),
    ])
      assert.equal(safeDemoReturn(value, identity), `/demo/${identity.kind}`);
  assert.equal(
    safeDemoReturn("/demo/admin?section=consultations", member),
    "/demo/member",
  );
  assert.equal(safeDemoReturn("/demo/member?section=qa", admin), "/demo/admin");
  assert.equal(
    safeDemoReturn(
      "/demo/member?section=consultations&record=member-example-pending&consultation=demo-consultation-1",
      member,
    ),
    "/demo/member?section=consultations&consultation=demo-consultation-1",
  );
  assert.equal(
    safeDemoReturn(
      "/demo/admin?section=applications&status=pending&record=member-example-pending",
      admin,
    ),
    "/demo/admin?section=applications&record=member-example-pending&status=pending",
  );
});
