import { test } from "node:test";
import assert from "node:assert/strict";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import {
  createDemoSession,
  reduceDemoSession,
  memberFormFields,
  type DemoMemberAction,
  type DemoSession,
} from "../../src/domain/demo-member";
import { publicSessionQuestions } from "../../src/domain/qa-session";
import { demoDirectory } from "../../src/data/demo/repository";
const seed = getDemoSessionSeed();
function signed(account: string) {
  return reduceDemoSession(
    createDemoSession(seed),
    {
      type: "demo-sign-in",
      fields: { email: `${account}@example.invalid`, passcode: "home-access" },
    },
    seed,
  );
}
test("demo mutations enforce administrator decisions and owning profile edits while preserving public applications", () => {
  const record = seed.records[0];
  const profile = {
    ...memberFormFields(record),
    businessName: "Updated example",
  };
  const protectedActions: DemoMemberAction[] = [
    {
      type: "decide",
      id: record.id,
      approval: "rejected",
      reason: "Sample decision",
    },
    {
      type: "suspend",
      id: record.id,
      suspended: true,
      reason: "Sample suspension",
    },
    {
      type: "credential",
      id: record.id,
      credentialId: record.credentials[0].id,
      verification: "verified",
    },
    { type: "rename-category", id: "healthy-designers", name: "Sample design" },
  ];
  for (const state of [
    createDemoSession(seed),
    signed("approved"),
    signed("pending"),
  ]) {
    for (const action of protectedActions)
      assert.equal(reduceDemoSession(state, action, seed), state);
    if (
      state.identity?.kind !== "member" ||
      state.identity.memberId !== record.id
    )
      assert.equal(
        reduceDemoSession(
          state,
          { type: "edit", id: record.id, profile },
          seed,
        ),
        state,
      );
  }
  for (const action of protectedActions) {
    const admin = signed("admin");
    assert.notEqual(reduceDemoSession(admin, action, seed), admin);
  }
  for (const account of ["admin", "approved"]) {
    const state = signed(account);
    assert.equal(
      reduceDemoSession(state, { type: "edit", id: record.id, profile }, seed)
        .records[0].profile.businessName,
      profile.businessName,
    );
  }
  assert.equal(
    reduceDemoSession(
      createDemoSession(seed),
      { type: "submit", profile },
      seed,
    ).records.at(-1)?.approval,
    "pending",
  );
});
test("published member attribution uses only the explicit association and a currently eligible profile", () => {
  const state: DemoSession = {
    ...signed("fern"),
    publicProfessionalIds: ["demo-mold-inspection"],
    qa: {
      snapshot: [],
      questionDecisions: {},
      answerDecisions: {},
      answers: [
        {
          id: "answer",
          questionId: "question",
          authorId: "member-example-fern",
          attribution: "Fern & Field Inspections",
          body: "Sample answer for presentation only.",
          status: "published" as const,
        },
      ],
    },
    questions: [
      {
        id: "question",
        title: "Sample question",
        categoryId: "mold-inspection",
        body: "A sample question for layout review.",
        status: "pending" as const,
      },
    ],
  };
  state.qa.questionDecisions = { question: { status: "published", note: "" } };
  assert.equal(
    publicSessionQuestions(state)[0].answers[0].profileHref,
    "/professionals/demo-mold-inspection",
  );
  const suspended = {
    ...state,
    records: state.records.map((record) =>
      record.id === "member-example-fern"
        ? { ...record, suspended: true }
        : record,
    ),
  };
  assert.equal(
    publicSessionQuestions(suspended)[0].answers[0].profileHref,
    undefined,
  );
  assert.equal(
    publicSessionQuestions({ ...state, publicProfessionalIds: [] })[0]
      .answers[0].profileHref,
    undefined,
  );
});
test("featured examples include eligible public projections and exclude the suspended featured fixture", async () => {
  const featured = await demoDirectory.listFeaturedPublic();
  assert.deepEqual(
    featured.map((record) => record.id),
    ["demo-mold-inspection", "demo-healthy-designers"],
  );
  assert.ok(
    featured.every(
      (record) => !("billing" in record) && !("account" in record),
    ),
  );
});
