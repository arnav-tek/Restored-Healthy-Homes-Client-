import { test } from "node:test";
import { selectDemoAccount } from "./demo-account-helper";
import assert from "node:assert/strict";
import {
  createDemoSession,
  reduceDemoSession,
  type DemoSession,
  type DemoMemberAction,
} from "../../src/domain/demo-member";
import {
  canCoordinate,
  consultationNeedsAttention,
  ownConsultations,
  publicConsultationSummary,
  type ConsultationAction,
} from "../../src/domain/consultation-session";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import { parseCoordinationNote } from "../../src/validation/consultation";
import {
  dashboardHref,
  parseDashboardQuery,
} from "../../src/validation/dashboard";
const seed = getDemoSessionSeed();
const first = "member-example-approved",
  second = "member-example-coordinator";
function start() {
  return reduceDemoSession(
    createDemoSession(seed),
    {
      type: "request-consultation",
      fields: {
        name: "VISITOR_NAME",
        email: "visitor@example.invalid",
        categoryId: "healthy-designers",
        format: "video",
        topic: "A fictional coordination topic with plain text <b>only</b>.",
      },
    },
    seed,
  );
}
const act = (state: DemoSession, action: DemoMemberAction) =>
  reduceDemoSession(state, action, seed);
test("consultation lifecycle guards transitions, repeated actions, accepted confirmations and closed records", () => {
  let state = start();
  const id = state.consultations[0].id;
  for (const type of [
    "accept-consultation",
    "decline-consultation",
    "unassign-consultation",
  ] as const)
    assert.equal(act(state, { type, id }), state);
  assert.equal(
    act(state, {
      type: "assign-consultation",
      id: "missing",
      providerId: first,
    }),
    state,
  );
  const assign = {
    type: "assign-consultation",
    id,
    providerId: first,
  } as const;
  state = act(state, assign);
  assert.equal(state.consultations[0].status, "assigned");
  assert.equal(act(state, assign), state);
  state = act(state, { type: "accept-consultation", id });
  assert.equal(state.consultations[0].status, "accepted");
  assert.equal(act(state, { type: "accept-consultation", id }), state);
  assert.equal(act(state, { type: "decline-consultation", id }), state);
  for (const action of [
    { type: "assign-consultation", id, providerId: second },
    { type: "unassign-consultation", id },
    { type: "cancel-consultation", id, confirmed: false },
  ] satisfies ConsultationAction[])
    assert.equal(act(state, action), state);
  state = act(state, {
    type: "assign-consultation",
    id,
    providerId: second,
    confirmed: true,
  });
  assert.equal(state.consultations[0].status, "assigned");
  state = selectDemoAccount(state, second, seed);
  state = act(state, { type: "accept-consultation", id });
  state = act(state, { type: "unassign-consultation", id, confirmed: true });
  assert.equal(state.consultations[0].status, "requested");
  assert.equal(state.consultations[0].providerId, null);
  state = act(state, assign);
  state = act(state, { type: "unassign-consultation", id });
  state = act(state, { type: "cancel-consultation", id, confirmed: true });
  assert.equal(state.consultations[0].status, "cancelled");
  for (const action of [
    assign,
    { type: "accept-consultation", id },
    { type: "decline-consultation", id },
    { type: "unassign-consultation", id, confirmed: true },
    { type: "cancel-consultation", id, confirmed: true },
  ] satisfies ConsultationAction[])
    assert.equal(act(state, action), state);
});
test("assignment and acceptance recheck every eligibility condition and exact category membership", () => {
  const original = start();
  const id = original.consultations[0].id;
  assert.equal(
    act(original, { type: "assign-consultation", id, providerId: "unknown" }),
    original,
  );
  for (const approval of ["pending", "approved", "rejected"] as const)
    for (const subscription of [
      "active",
      "inactive",
      "past_due",
      "canceled",
      "trialing",
      "unpaid",
    ] as const)
      for (const suspended of [false, true])
        for (const categoryIds of [
          ["healthy-designers"],
          ["healthy-trades"],
          [],
        ]) {
          const member = {
            ...original.records[0],
            approval,
            subscription,
            suspended,
            profile: { ...original.records[0].profile, categoryIds },
          };
          const state = { ...original, records: [member] };
          const eligible =
            approval === "approved" &&
            subscription === "active" &&
            !suspended &&
            categoryIds.includes("healthy-designers");
          assert.equal(canCoordinate(member, "healthy-designers"), eligible);
          const assigned = act(state, {
            type: "assign-consultation",
            id,
            providerId: first,
          });
          assert.equal(assigned !== state, eligible);
          const previouslyAssigned = {
            ...state,
            consultations: [
              {
                ...state.consultations[0],
                status: "assigned" as const,
                providerId: first,
              },
            ],
          };
          assert.equal(
            consultationNeedsAttention(
              previouslyAssigned,
              previouslyAssigned.consultations[0],
            ),
            !eligible,
          );
          assert.equal(
            act(previouslyAssigned, { type: "accept-consultation", id }) !==
              previouslyAssigned,
            eligible,
          );
          assert.equal(previouslyAssigned.consultations[0].status, "assigned");
        }
});
test("member ownership comes from selected session state; decline clears ownership and permits reassignment", () => {
  let state = start();
  const id = state.consultations[0].id;
  assert.deepEqual(ownConsultations(state), []);
  state = act(state, { type: "assign-consultation", id, providerId: first });
  state = selectDemoAccount(state, second, seed);
  assert.deepEqual(ownConsultations(state), []);
  const forged = {
    type: "accept-consultation" as const,
    id,
    memberId: first,
    providerId: first,
  };
  assert.equal(act(state, forged), state);
  assert.equal(act(state, { type: "decline-consultation", id }), state);
  state = selectDemoAccount(state, first, seed);
  state = act(state, { type: "decline-consultation", id });
  assert.equal(state.consultations[0].providerId, null);
  assert.equal(state.consultations[0].status, "requested");
  assert.deepEqual(ownConsultations(state), []);
  assert.equal(act(state, { type: "decline-consultation", id }), state);
  state = act(state, { type: "assign-consultation", id, providerId: second });
  assert.equal(state.consultations[0].providerId, second);
});
test("management preserves visitor fields, offer snapshots, stable IDs and separate payment; ignores protected payloads", () => {
  let state = start();
  const original = state.consultations[0];
  const id = original.id;
  const forged = {
    type: "assign-consultation" as const,
    id,
    providerId: first,
    status: "accepted",
    scheduledAt: "tomorrow",
    paymentStatus: "paid",
    name: "changed",
    offer: { amountCents: 1 },
    adminNote: "forged",
  };
  state = act(state, forged);
  assert.equal(state.consultations[0].status, "assigned");
  assert.equal(state.consultations[0].adminNote, "");
  for (const action of [
    { type: "note-consultation", id, note: "  ADMIN_ONLY  " },
    { type: "accept-consultation", id },
    { type: "cancel-consultation", id, confirmed: true },
  ] satisfies ConsultationAction[]) {
    state = act(state, action);
    const current = state.consultations[0];
    for (const key of [
      "id",
      "name",
      "email",
      "categoryId",
      "format",
      "topic",
      "paymentStatus",
      "offer",
      "scheduledAt",
    ] as const)
      assert.deepEqual(current[key], original[key]);
    assert.equal(current.offer, original.offer);
  }
  assert.equal(state.consultations[0].providerId, first);
  assert.equal(
    consultationNeedsAttention(state, state.consultations[0]),
    false,
  );
  assert.equal(state.consultations[0].adminNote, "ADMIN_ONLY");
  assert.deepEqual(state.records, seed.records);
});
test("admin notes validate bounds; member/public projections allowlist fields and copy offer data", () => {
  assert.equal(parseCoordinationNote(" "), "");
  assert.equal(parseCoordinationNote("x".repeat(500))?.length, 500);
  for (const input of ["x".repeat(501), null, 3, []])
    assert.equal(parseCoordinationNote(input), null);
  let state = start();
  const id = state.consultations[0].id;
  state = act(state, { type: "assign-consultation", id, providerId: first });
  state = act(state, { type: "note-consultation", id, note: "ADMIN_ONLY" });
  assert.equal(
    act(state, { type: "note-consultation", id, note: "ADMIN_ONLY" }),
    state,
  );
  assert.equal(
    act(state, { type: "note-consultation", id, note: "x".repeat(501) }),
    state,
  );
  const publicView = publicConsultationSummary(state.consultations[0]);
  const member = ownConsultations(state)[0];
  const publicKeys = [
    "id",
    "categoryId",
    "format",
    "offer",
    "status",
    "paymentStatus",
  ].sort();
  assert.deepEqual(Object.keys(publicView).sort(), publicKeys);
  assert.deepEqual(
    Object.keys(member).sort(),
    [...publicKeys, "topic", "needsAttention"].sort(),
  );
  for (const view of [publicView, member]) {
    assert.doesNotMatch(
      JSON.stringify(view),
      /VISITOR_NAME|visitor@example|ADMIN_ONLY|member-example/,
    );
    assert.notEqual(view.offer, state.consultations[0].offer);
  }
  assert.ok(!("topic" in publicView));
});
test("consultation changes isolate other workflows and reset original fixtures with unique subsequent IDs", () => {
  let state = start();
  const original = state;
  const id = state.consultations[0].id;
  state = act(state, { type: "assign-consultation", id, providerId: first });
  state = act(state, { type: "note-consultation", id, note: "ADMIN_ONLY" });
  for (const key of ["records", "inquiries", "qa", "questions"] as const)
    assert.equal(state[key], original[key]);
  state = act(state, { type: "new-consultation" });
  assert.equal(state.consultations.length, 1);
  state = act(state, { type: "reset" });
  assert.equal(state.consultations.length, 0);
  assert.equal(state.consultationId, null);
  assert.deepEqual(state.records, seed.records);
  state = act(state, {
    type: "request-consultation",
    fields: original.consultations[0],
  });
  assert.notEqual(state.consultations[0].id, id);
  assert.equal(state.consultations[0].adminNote, "");
});
test("consultation dashboard URLs validate IDs/enums, preserve filters and omit contact/text inputs", () => {
  const params = new URLSearchParams(
    "section=consultations&consultation=demo-consultation-1&consultationStatus=assigned&assignment=unassigned&category=healthy-designers&q=PRIVATE&email=PRIVATE&topic=PRIVATE",
  );
  const query = parseDashboardQuery("admin", params);
  const href = dashboardHref("admin", query);
  assert.match(href, /consultation=demo-consultation-1/);
  assert.doesNotMatch(href, /PRIVATE|email|topic|q=/);
  assert.match(
    dashboardHref("admin", query, { consultation: "" }),
    /assignment=unassigned/,
  );
  assert.doesNotMatch(dashboardHref("member", query), /assignment=|category=/);
  for (const value of [
    "../secret",
    "demo-consultation-0",
    "x".repeat(101),
    "demo-consultation-1&consultation=demo-consultation-2",
  ])
    assert.equal(
      parseDashboardQuery("admin", new URLSearchParams(`consultation=${value}`))
        .consultation,
      "",
    );
  const invalid = parseDashboardQuery(
    "member",
    new URLSearchParams("consultationStatus=paid&assignment=booked"),
  );
  assert.equal(invalid.consultationStatus, "all");
  assert.equal(invalid.assignment, "all");
});
