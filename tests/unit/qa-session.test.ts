import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDemoSession,
  reduceDemoSession,
  type DemoMemberAction,
} from "../../src/domain/demo-member";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import { demoQaRepository } from "../../src/data/demo/qa-repository";
import {
  canMemberAnswer,
  publicSessionQuestions,
  qaReviewQuestions,
  qaReviewAnswers,
  ownQaAnswers,
} from "../../src/domain/qa-session";
import {
  parseAnswer,
  parseModerationNote,
} from "../../src/validation/qa-moderation";
import {
  isSessionQuestionId,
  searchPublicQuestions,
} from "../../src/domain/qa";
import {
  parseDashboardQuery,
  dashboardHref,
} from "../../src/validation/dashboard";
const seed = getDemoSessionSeed();
const body =
  "A fictional professional could provide a sample project schedule.";
test("answer validation trims plain text and rejects invalid types/lengths; notes are bounded", () => {
  for (const input of [null, [], 123, " ", "x".repeat(19), "x".repeat(3001)])
    assert.equal(parseAnswer(input), null);
  assert.equal(parseAnswer("  " + body + "  "), body);
  assert.equal(parseAnswer("x".repeat(20))?.length, 20);
  assert.equal(parseAnswer("x".repeat(3000))?.length, 3000);
  assert.equal(
    parseAnswer("<script>fictional text</script>"),
    "<script>fictional text</script>",
  );
  assert.equal(parseModerationNote("   "), "");
  assert.equal(parseModerationNote("x".repeat(500))?.length, 500);
  assert.equal(parseModerationNote("x".repeat(501)), null);
  assert.equal(parseModerationNote({}), null);
});
test("all eligibility combinations enforce selected author ownership, forced pending and duplicate prevention", async () => {
  const snapshot = await demoQaRepository.listPublic();
  const initial = createDemoSession(seed, snapshot);
  for (const approval of ["pending", "approved", "rejected"] as const)
    for (const subscription of ["active", "inactive"] as const)
      for (const suspended of [true, false]) {
        const member = {
          ...seed.records[0],
          profile: { ...seed.records[0].profile, categoryIds: [snapshot[0].categoryId] },
          approval,
          subscription,
          suspended,
        };
        const state = { ...initial, records: [member], selectedId: member.id };
        const allowed =
          approval === "approved" && subscription === "active" && !suspended;
        assert.equal(canMemberAnswer(member), allowed);
        const action = {
          type: "submit-answer",
          questionId: snapshot[0].id,
          body,
          authorId: "attacker",
          status: "published",
        } as const;
        const next = reduceDemoSession(state, action, seed);
        assert.equal(next.qa.answers.length, allowed ? 1 : 0);
        if (allowed) {
          assert.equal(next.qa.answers[0].authorId, member.id);
          assert.equal(next.qa.answers[0].status, "pending");
          assert.equal(
            next.qa.answers[0].attribution,
            member.profile.businessName,
          );
          assert.equal(reduceDemoSession(next, action, seed), next);
          assert.equal(ownQaAnswers(next, "attacker").length, 0);
        } else assert.equal(next, state);
      }
  for (const questionId of ["missing", "pending-seed-question"])
    assert.equal(
      reduceDemoSession(
        initial,
        { type: "submit-answer", questionId, body },
        seed,
      ),
      initial,
    );
});
test("session moderation preserves independent statuses, IDs, public allowlists and original reset snapshot", async () => {
  const snapshot = await demoQaRepository.listPublic();
  let state = createDemoSession(seed, snapshot);
  const act = (action: DemoMemberAction) =>
    (state = reduceDemoSession(state, action, seed));
  act({
    type: "submit-question",
    question: {
      title: "Session planning example",
      categoryId: "healthy-designers",
      body,
    },
  });
  const id = state.questions[0].id;
  assert.ok(isSessionQuestionId(id));
  assert.equal(publicSessionQuestions(state).length, snapshot.length);
  const pending = state;
  act({ type: "submit-answer", questionId: id, body });
  assert.equal(state, pending);
  act({
    type: "moderate-question",
    id,
    status: "published",
    note: "INTERNAL_ONLY",
  });
  act({ type: "submit-answer", questionId: id, body });
  const answerId = state.qa.answers[0].id;
  assert.equal(
    publicSessionQuestions(state).find((item) => item.id === id)?.answers
      .length,
    0,
  );
  act({
    type: "moderate-answer",
    id: answerId,
    status: "published",
    note: "ANSWER_INTERNAL",
  });
  let projected = publicSessionQuestions(state).find((item) => item.id === id)!;
  assert.deepEqual(Object.keys(projected).sort(), [
    "answers",
    "body",
    "categoryId",
    "id",
    "title",
  ]);
  assert.deepEqual(Object.keys(projected.answers[0]).sort(), [
    "attribution",
    "body",
    "id",
  ]);
  assert.ok(
    !JSON.stringify([
      publicSessionQuestions(state),
      ownQaAnswers(state, state.selectedId),
    ]).includes("INTERNAL"),
  );
  const previous = state;
  act({
    type: "moderate-answer",
    id: answerId,
    status: "published",
    note: "ANSWER_INTERNAL",
  });
  assert.equal(state, previous);
  act({
    type: "moderate-question",
    id: "unknown",
    status: "published",
    note: "",
  });
  assert.equal(state, previous);
  act({
    type: "moderate-question",
    id,
    status: "published",
    note: "x".repeat(501),
  });
  assert.equal(state, previous);
  act({
    type: "moderate-question",
    id,
    status: "pending",
    note: "",
  } as unknown as DemoMemberAction);
  assert.equal(state, previous);
  act({
    type: "moderate-question",
    id,
    status: "rejected",
    note: "hide parent",
  });
  assert.equal(
    publicSessionQuestions(state).some((item) => item.id === id),
    false,
  );
  assert.equal(
    qaReviewAnswers(state).find((item) => item.id === answerId)?.status,
    "published",
  );
  assert.equal(
    searchPublicQuestions(publicSessionQuestions(state), {
      q: "Session planning example",
      category: "",
      page: 1,
    }).total,
    0,
  );
  act({ type: "moderate-question", id, status: "published", note: "" });
  projected = publicSessionQuestions(state).find((item) => item.id === id)!;
  assert.equal(projected.answers[0].id, answerId);
  act({ type: "moderate-answer", id: answerId, status: "rejected", note: "" });
  assert.equal(
    publicSessionQuestions(state).find((item) => item.id === id)?.answers
      .length,
    0,
  );
  assert.equal(ownQaAnswers(state, state.selectedId)[0].status, "rejected");
  act({
    type: "moderate-question",
    id: snapshot[0].id,
    status: "rejected",
    note: "",
  });
  act({ type: "reset" });
  assert.deepEqual(publicSessionQuestions(state), snapshot);
  assert.equal(qaReviewQuestions(state).length, snapshot.length);
  assert.equal(state.qa.answers.length, 0);
  act({
    type: "submit-question",
    question: {
      title: "Another sample question",
      categoryId: "healthy-designers",
      body,
    },
  });
  assert.notEqual(state.questions[0].id, id);
});
test("Q&A navigation validates record IDs/status/queues and preserves filters on detail return", () => {
  const query = parseDashboardQuery(
    "admin",
    new URLSearchParams(
      "section=qa&queue=answers&qaStatus=pending&category=healthy-designers&q=sample&answer=demo-session-answer-1",
    ),
  );
  assert.equal(query.queue, "answers");
  assert.equal(query.qaStatus, "pending");
  assert.match(dashboardHref("admin", query), /answer=demo-session-answer-1/);
  assert.ok(!dashboardHref("admin", query, { answer: "" }).includes("answer="));
  const invalid = parseDashboardQuery(
    "admin",
    new URLSearchParams(
      "question=../private&answer=a&answer=b&qaStatus=approved&queue=external",
    ),
  );
  assert.equal(invalid.question, "");
  assert.equal(invalid.answer, "");
  assert.equal(invalid.qaStatus, "all");
  assert.equal(invalid.queue, "questions");
  assert.equal(isSessionQuestionId("demo-session-question-0"), false);
});
