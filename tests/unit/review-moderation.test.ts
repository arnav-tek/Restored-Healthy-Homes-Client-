import { test } from "node:test";
import assert from "node:assert/strict";
import { demoReviewRepository } from "../../src/data/demo/review-repository";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import {
  createDemoSession,
  reduceDemoSession,
  type DemoSession,
  type DemoMemberAction,
} from "../../src/domain/demo-member";
import { demoAccounts } from "../../src/domain/demo-identity";
import {
  demoProfessionalAssociations,
  professionalForMember,
} from "../../src/domain/professional-association";
import {
  moderationReviews,
  publicSessionReviews,
  memberReviewView,
  currentReviewSubmission,
  reduceReviewAction,
  type ReviewAction,
} from "../../src/domain/review-session";
import { summarizeReviews } from "../../src/domain/review";
import { parseReviewPage } from "../../src/validation/review";
import {
  dashboardHref,
  parseDashboardQuery,
} from "../../src/validation/dashboard";
import { safeDemoReturn } from "../../src/validation/demo-sign-in";

const seed = getDemoSessionSeed();
const target = "demo-mold-inspection";
const fields = {
  displayName: "Fictional Visitor",
  rating: 1 as const,
  body: "A fictional review of a sample service conversation.",
};
const act = (state: DemoSession, action: DemoMemberAction) =>
  reduceDemoSession(state, action, seed);
function signIn(state: DemoSession, account: string) {
  return act(act(state, { type: "demo-sign-out" }), {
    type: "demo-sign-in",
    fields: { email: `${account}@example.invalid`, passcode: "home-demo" },
  });
}
async function initial() {
  const snapshot = await demoReviewRepository.publicSnapshot();
  return createDemoSession(
    seed,
    [],
    snapshot.professionals.map((item) => item.id),
    snapshot,
  );
}
function published(state: DemoSession, professionalId = target) {
  return publicSessionReviews(
    state.reviews,
    state.publicProfessionalIds,
    professionalId,
  );
}
const decision = (
  id: string,
  status: "published" | "rejected",
  note = "Sample internal note",
): Extract<ReviewAction, { type: "moderate-review" }> => ({
  type: "moderate-review",
  id,
  status,
  note,
});

test("review ownership uses explicit stable associations, never mutable names, categories or selected records", async () => {
  const state = await initial();
  for (const link of demoProfessionalAssociations) {
    assert.equal(professionalForMember(link.memberId), link.professionalId);
    assert.ok(state.publicProfessionalIds.includes(link.professionalId));
    assert.ok(
      demoAccounts(null).some(
        (account) =>
          account.identity.kind === "member" &&
          account.identity.memberId === link.memberId,
      ),
    );
  }
  assert.equal(professionalForMember("member-example-approved"), null);
  assert.equal(professionalForMember("unknown"), null);
  const fern = signIn(state, "fern");
  assert.equal(memberReviewView(fern).reviews.length, 4);
  assert.equal(
    memberReviewView({
      ...fern,
      selectedId: "member-example-cedar",
      records: fern.records.map((record) => ({
        ...record,
        profile: {
          ...record.profile,
          businessName: "renamed",
          categoryIds: [],
        },
      })),
    }).professionalId,
    target,
  );
  assert.deepEqual(memberReviewView(signIn(state, "approved")), {
    professionalId: null,
    reviews: [],
  });
  assert.deepEqual(memberReviewView(signIn(state, "cedar")), {
    professionalId: "demo-mold-remediation",
    reviews: [],
  });
  assert.deepEqual(memberReviewView(signIn(state, "admin")), {
    professionalId: null,
    reviews: [],
  });
});

test("public snapshot excludes hidden server fixtures and uses an exact review and professional allowlist", async () => {
  const state = await initial();
  const json = JSON.stringify(state.reviews.snapshot);
  for (const text of [
    "REVIEW_HIDDEN",
    "REVIEW_PRIVATE",
    "review-private@",
    "moderationNote",
    "privateContact",
    "status",
  ])
    assert.ok(!json.includes(text));
  assert.deepEqual(
    Object.keys(state.reviews.snapshot.professionals[0]).sort(),
    ["businessName", "id"],
  );
  assert.deepEqual(Object.keys(state.reviews.snapshot.reviews[0]).sort(), [
    "body",
    "displayName",
    "id",
    "professionalId",
    "publishedAt",
    "rating",
  ]);
});

test("moderation changes only allowed fields; repeated decisions are idempotent and republication reorders deterministically", async () => {
  let state = act(await initial(), {
    type: "submit-review",
    professionalId: target,
    fields,
  });
  const original = structuredClone(state.reviews.submissions[0]);
  const id = original.id;
  state = signIn(state, "admin");
  state = act(state, {
    ...decision(id, "published"),
    body: "forged",
    rating: 5,
    professionalId: "demo-mold-remediation",
    displayName: "forged",
    publishedAt: "2099-01-01",
    verified: true,
  } as DemoMemberAction);
  assert.deepEqual(state.reviews.submissions[0], original);
  assert.deepEqual(summarizeReviews(published(state)), {
    count: 5,
    average: 3.8,
  });
  const firstDate = published(state)[0].publishedAt;
  assert.equal(published(state)[0].id, id);
  assert.notEqual(firstDate, "2099-01-01");
  assert.equal(act(state, decision(id, "published")), state);
  state = act(state, decision(id, "published", "Changed internal note"));
  assert.equal(published(state)[0].publishedAt, firstDate);
  state = act(state, decision(id, "rejected"));
  assert.deepEqual(summarizeReviews(published(state)), {
    count: 4,
    average: 4.5,
  });
  assert.equal(
    currentReviewSubmission(state.reviews, target)?.status,
    "rejected",
  );
  assert.ok(
    !JSON.stringify(currentReviewSubmission(state.reviews, target)).includes(
      "internal",
    ),
  );
  state = act(state, decision(id, "published"));
  assert.ok(published(state)[0].publishedAt > firstDate);
  assert.equal(
    currentReviewSubmission(state.reviews, target)?.status,
    "published",
  );
  assert.ok(!JSON.stringify(published(state)).includes("Sample internal note"));
  assert.ok(
    !JSON.stringify(memberReviewView(signIn(state, "fern"))).includes(
      "Sample internal note",
    ),
  );
});

test("domain boundary rejects unauthenticated/member moderation, missing targets, invalid decisions and oversized notes", async () => {
  const state = await initial();
  const id = state.reviews.snapshot.reviews[0].id;
  assert.equal(act(state, decision(id, "rejected")), state);
  const member = signIn(state, "fern");
  assert.equal(act(member, decision(id, "rejected")), member);
  const admin = signIn(state, "admin");
  for (const action of [
    decision("missing", "published"),
    decision(id, "published", "x".repeat(501)),
    decision(id, "published", " ".repeat(501)),
    { ...decision(id, "published"), status: "pending" },
    { ...decision(id, "published"), note: {} },
  ])
    assert.equal(act(admin, action as DemoMemberAction), admin);
  const unavailable = { ...admin, publicProfessionalIds: [] };
  assert.equal(act(unavailable, decision(id, "rejected")), unavailable);
  assert.deepEqual(published(unavailable), []);
  assert.notEqual(
    act(admin, decision(id, "published", "x".repeat(500))),
    admin,
  );
  let pending = act(admin, {
    type: "submit-review",
    professionalId: target,
    fields,
  });
  const pendingId = pending.reviews.submissions[0].id;
  pending = act(pending, decision(pendingId, "rejected"));
  assert.equal(
    currentReviewSubmission(pending.reviews, target)?.status,
    "rejected",
  );
  assert.equal(act(pending, decision(pendingId, "rejected")), pending);
});

test("seed and session merging deduplicates before projection, counts and pagination; rejection can empty a profile", async () => {
  let state = signIn(await initial(), "admin");
  const first = state.reviews.snapshot.reviews[0];
  const duplicate = {
    ...state.reviews,
    snapshot: {
      ...state.reviews.snapshot,
      reviews: [...state.reviews.snapshot.reviews, first],
    },
    submissions: [
      {
        id: first.id,
        professionalId: target,
        ...fields,
        status: "pending" as const,
      },
    ],
  };
  assert.equal(
    moderationReviews(duplicate).filter((review) => review.id === first.id)
      .length,
    1,
  );
  assert.equal(
    publicSessionReviews(duplicate, state.publicProfessionalIds, target).length,
    4,
  );
  assert.deepEqual(parseReviewPage("2", published(state).length), {
    page: 2,
    pages: 2,
  });
  state = act(state, decision(first.id, "rejected"));
  assert.deepEqual(parseReviewPage("2", published(state).length), {
    page: 1,
    pages: 1,
  });
  for (const review of published(state))
    state = act(state, decision(review.id, "rejected"));
  assert.deepEqual(summarizeReviews(published(state)), {
    count: 0,
    average: null,
  });
  assert.equal(memberReviewView(signIn(state, "fern")).reviews.length, 0);
});

test("sign-out retains review decisions; reset restores snapshots and identity without coupling member listing eligibility", async () => {
  const original = await initial();
  let state = signIn(
    act(original, { type: "submit-review", professionalId: target, fields }),
    "admin",
  );
  state = act(state, decision(state.reviews.submissions[0].id, "published"));
  const signedOut = act(state, { type: "demo-sign-out" });
  assert.equal(signedOut.reviews, state.reviews);
  const suspended = {
    ...state,
    records: state.records.map((record) => ({ ...record, suspended: true })),
  };
  assert.equal(published(suspended).length, 5);
  const reset = act(state, { type: "reset" });
  assert.deepEqual(reset.reviews, original.reviews);
  assert.equal(reset.identity, null);
  assert.equal(currentReviewSubmission(reset.reviews, target), null);
  assert.deepEqual(published(reset), published(original));
});

test("review dashboard URL contract bounds IDs/status and never uses member parameters as ownership", () => {
  const query = parseDashboardQuery(
    "admin",
    new URLSearchParams(
      "section=reviews&review=demo-session-review-1&reviewStatus=pending&professional=demo-mold-inspection&note=private&body=private",
    ),
  );
  assert.equal(
    dashboardHref("admin", query),
    "/demo/admin?section=reviews&review=demo-session-review-1&reviewStatus=pending&professional=demo-mold-inspection",
  );
  assert.equal(dashboardHref("member", query), "/demo/member?section=reviews");
  const invalid = parseDashboardQuery(
    "admin",
    new URLSearchParams(
      `section=reviews&review=../secret&reviewStatus=verified&professional=${"a".repeat(101)}`,
    ),
  );
  assert.equal(dashboardHref("admin", invalid), "/demo/admin?section=reviews");
  const duplicate = parseDashboardQuery(
    "admin",
    new URLSearchParams(
      "section=reviews&review=a&review=b&professional=a&professional=b&reviewStatus=pending&reviewStatus=published",
    ),
  );
  assert.equal(
    dashboardHref("admin", duplicate),
    "/demo/admin?section=reviews",
  );
  assert.equal(
    safeDemoReturn("https://evil.invalid/demo/admin?section=reviews", {
      kind: "admin",
      accountId: "admin",
    }),
    "/demo/admin",
  );
  assert.equal(
    safeDemoReturn(
      "/demo/member?section=reviews&professional=demo-mold-inspection",
      { kind: "member", accountId: "cedar", memberId: "member-example-cedar" },
    ),
    "/demo/member?section=reviews",
  );
  const reviewState = {
    snapshot: { professionals: [], reviews: [] },
    submissions: [],
    decisions: {},
    currentByProfessional: {},
    nextSequence: 1,
  };
  assert.equal(
    reduceReviewAction(reviewState, decision("missing", "published"), [], null),
    reviewState,
  );
});
