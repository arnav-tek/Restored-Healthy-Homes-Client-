import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDemoSession,
  reduceDemoSession,
  type DemoSession,
  type DemoMemberAction,
} from "../../src/domain/demo-member";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import {
  memberQuestionInbox,
  publicSessionQuestions,
} from "../../src/domain/qa-session";
import { canCoordinate } from "../../src/domain/consultation-session";
import {
  validSamplePhoto,
  samplePhotoLimit,
} from "../../src/validation/sample-photo";
const seed = getDemoSessionSeed();
const act = (state: DemoSession, action: DemoMemberAction) =>
  reduceDemoSession(state, action, seed);
function signIn(state: DemoSession, account: string) {
  return act(act(state, { type: "demo-sign-out" }), {
    type: "demo-sign-in",
    fields: { email: `${account}@example.invalid`, passcode: "home-access" },
  });
}

test("free consultation participation is owner editable, independent of eligibility and resettable", () => {
  let state = signIn(createDemoSession(seed), "approved");
  const record = state.records[0];
  assert.equal(canCoordinate(record, "healthy-designers"), true);
  assert.equal(
    act(state, {
      type: "set-free-consultation",
      id: "member-example-builder",
      enabled: false,
    }),
    state,
  );
  state = act(state, {
    type: "set-free-consultation",
    id: record.id,
    enabled: false,
  });
  assert.equal(canCoordinate(state.records[0], "healthy-designers"), false);
  assert.equal(state.records[0].approval, record.approval);
  assert.equal(state.records[0].subscription, record.subscription);
  assert.equal(
    canCoordinate({ ...record, suspended: true }, "healthy-designers"),
    false,
  );
  assert.equal(canCoordinate(record, "healthy-builders"), false);
  assert.equal(act(state, { type: "reset" }).records[0].freeConsultation, true);
});

test("category inboxes wait for moderation; first response wins until rejected, without public identity leakage", () => {
  let state = createDemoSession(seed);
  state = act(state, {
    type: "submit-question",
    question: {
      title: "Sample material planning question",
      body: "Which fictional materials should I discuss with a healthy-home designer?",
      categoryId: "healthy-designers",
    },
  });
  const questionId = state.questionId!;
  assert.equal(memberQuestionInbox(state, "member-example-approved").length, 0);
  state = signIn(state, "admin");
  state = act(state, {
    type: "moderate-question",
    id: questionId,
    status: "published",
    note: "",
  });
  assert.equal(memberQuestionInbox(state, "member-example-builder").length, 0);
  assert.equal(memberQuestionInbox(state, "member-example-approved").length, 1);
  assert.equal(memberQuestionInbox(state, "member-example-pending").length, 0);
  state = signIn(state, "approved");
  state = act(state, {
    type: "submit-answer",
    questionId,
    body: "The first fictional specialist response offers a useful starting point.",
  });
  const first = state.qa.answers[0].id;
  state = signIn(state, "coordinator");
  state = act(state, {
    type: "submit-answer",
    questionId,
    body: "The second fictional specialist response stays in the moderation queue.",
  });
  const second = state.qa.answers[1].id;
  state = signIn(state, "admin");
  state = act(state, {
    type: "moderate-answer",
    id: second,
    status: "published",
    note: "",
  });
  assert.equal(publicSessionQuestions(state)[0].answers.length, 0);
  state = act(state, {
    type: "moderate-answer",
    id: first,
    status: "published",
    note: "",
  });
  assert.equal(publicSessionQuestions(state)[0].answers.length, 1);
  assert.equal(publicSessionQuestions(state)[0].answers[0].id, first);
  state = act(state, {
    type: "moderate-answer",
    id: first,
    status: "rejected",
    note: "Sample rejection",
  });
  state = act(state, {
    type: "moderate-answer",
    id: second,
    status: "published",
    note: "",
  });
  assert.equal(publicSessionQuestions(state)[0].answers[0].id, second);
  state = act(state, {
    type: "moderate-answer",
    id: first,
    status: "published",
    note: "",
  });
  assert.equal(publicSessionQuestions(state)[0].answers.length, 1);
  assert.equal(publicSessionQuestions(state)[0].answers[0].id, second);
  state = act(state, {
    type: "moderate-answer",
    id: second,
    status: "rejected",
    note: "Review again",
  });
  state = act(state, {
    type: "moderate-answer",
    id: first,
    status: "published",
    note: "",
  });
  assert.equal(publicSessionQuestions(state)[0].answers[0].id, first);
  assert.ok(
    !JSON.stringify(publicSessionQuestions(state)).includes("@example.invalid"),
  );
  assert.equal(act(state, { type: "reset" }).questions.length, 0);
});

test("sample image preview checks size, declared format and file signatures without accepting SVG or HTML", () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(validSamplePhoto("image/png", 100, png), true);
  assert.equal(
    validSamplePhoto("image/jpeg", 100, new Uint8Array([255, 216, 255])),
    true,
  );
  assert.equal(validSamplePhoto("image/png", samplePhotoLimit + 1, png), false);
  assert.equal(validSamplePhoto("image/svg+xml", 100, png), false);
  assert.equal(
    validSamplePhoto(
      "image/png",
      100,
      new Uint8Array([60, 104, 116, 109, 108]),
    ),
    false,
  );
});
