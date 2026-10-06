import { test } from "node:test";
import assert from "node:assert/strict";
import {
  publicReviewsFor,
  summarizeReviews,
  type ReviewRecord,
  type ReviewFields,
} from "../../src/domain/review";
import { parseReview, parseReviewPage } from "../../src/validation/review";
import { demoReviews } from "../../src/data/demo/review-fixtures";
import { demoReviewRepository } from "../../src/data/demo/review-repository";
import { demoDirectory } from "../../src/data/demo/repository";
import { demoProfessionals } from "../../src/data/demo/fixtures";
import { isPubliclyEligible } from "../../src/domain/listing";
import {
  createDemoSession,
  reduceDemoSession,
} from "../../src/domain/demo-member";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
const target = "demo-mold-inspection";
const fields: ReviewFields = {
  displayName: "Sample Visitor",
  rating: 4,
  body: "A fictional service review for this local demo.",
};

test("published-only review projection and rating summary share one deterministically ordered set", () => {
  const reviews = publicReviewsFor([...demoReviews].reverse(), target);
  assert.equal(reviews.length, 4);
  assert.deepEqual(summarizeReviews(reviews), { count: 4, average: 4.5 });
  assert.deepEqual(
    reviews.map((review) => review.id),
    [
      "sample-inspection-plan",
      "sample-inspection-report",
      "sample-inspection-scope",
      "sample-inspection-visit",
    ],
  );
  assert.deepEqual(
    Object.keys(reviews[0]).sort(),
    [
      "id",
      "professionalId",
      "displayName",
      "rating",
      "body",
      "publishedAt",
    ].sort(),
  );
  assert.doesNotMatch(
    JSON.stringify(reviews),
    /REVIEW_PRIVATE|REVIEW_HIDDEN|privateContact|moderationNote|status|verified/,
  );
  reviews[0].displayName = "Changed copy";
  assert.notEqual(demoReviews[0].displayName, "Changed copy");
  assert.equal(
    new Set(demoReviews.map((review) => review.id)).size,
    demoReviews.length,
  );
});

test("review summaries distinguish no reviews from a rating, round once and ignore other profiles and invalid records", () => {
  assert.deepEqual(summarizeReviews([]), { count: 0, average: null });
  assert.deepEqual(
    summarizeReviews(publicReviewsFor(demoReviews, "demo-healthy-trades")),
    { count: 1, average: 3 },
  );
  const records = [5, 4, 4].map(
    (rating, index) =>
      ({ ...demoReviews[0], id: `fraction-${index}`, rating }) as ReviewRecord,
  );
  assert.deepEqual(summarizeReviews(publicReviewsFor(records, target)), {
    count: 3,
    average: 4.3,
  });
  assert.deepEqual(
    publicReviewsFor(
      [{ ...demoReviews[0], rating: 0 } as unknown as ReviewRecord],
      target,
    ),
    [],
  );
  assert.deepEqual(publicReviewsFor(demoReviews, "demo-mold-remediation"), []);
});

test("review repository uses existing professional eligibility for every direct target and fails closed for missing IDs", async () => {
  for (const professional of demoProfessionals) {
    const reviews = await demoReviewRepository.listPublic(professional.id);
    assert.equal(reviews !== null, isPubliclyEligible(professional));
    if (reviews)
      assert.ok(
        reviews.every((review) => review.professionalId === professional.id),
      );
  }
  assert.equal(
    await demoReviewRepository.listPublic("missing-professional"),
    null,
  );
  assert.equal(await demoReviewRepository.listPublic("demo-pending"), null);
  assert.deepEqual(
    await demoReviewRepository.listPublic("demo-mold-remediation"),
    [],
  );
});

test("review validation bounds text and integer ratings; returns only permitted plain-text fields", () => {
  assert.deepEqual(
    parseReview({
      ...fields,
      displayName: " Sample Visitor ",
      professionalId: "forged",
      status: "published",
      verified: true,
      email: "private@example.invalid",
    }),
    { ok: true, fields },
  );
  for (const rating of [1, 2, 3, 4, 5, "1", "2", "3", "4", "5"])
    assert.equal(parseReview({ ...fields, rating }).ok, true);
  for (const rating of [
    0,
    6,
    -1,
    1.5,
    NaN,
    Infinity,
    "",
    "1.5",
    "05",
    " 4 ",
    "1e0",
    null,
    true,
    [],
    {},
  ])
    assert.equal(parseReview({ ...fields, rating }).ok, false);
  for (const displayName of ["", " ", "A", "A".repeat(81), null, [], {}])
    assert.equal(parseReview({ ...fields, displayName }).ok, false);
  for (const body of ["", " ", "a".repeat(19), "a".repeat(2001), null, [], {}])
    assert.equal(parseReview({ ...fields, body }).ok, false);
  for (const [displayName, body] of [
    ["Ab", "x".repeat(20)],
    ["x".repeat(80), "x".repeat(2000)],
  ])
    assert.equal(parseReview({ ...fields, displayName, body }).ok, true);
  const literal = "<img src=x onerror=alert(1)> This is fictional plain text.";
  assert.deepEqual(parseReview({ ...fields, body: literal }), {
    ok: true,
    fields: { ...fields, body: literal },
  });
});

test("review pages reject ambiguous or malformed input and clamp to the published set", () => {
  for (const value of [
    undefined,
    [],
    ["1", "2"],
    "-1",
    "0",
    "1.5",
    "01",
    "999999",
    "Infinity",
    "bad",
  ])
    assert.deepEqual(parseReviewPage(value, 4), { page: 1, pages: 2 });
  assert.deepEqual(parseReviewPage("99999", 4), { page: 2, pages: 2 });
  assert.deepEqual(parseReviewPage("2", 0), { page: 1, pages: 1 });
});

test("shared review session rejects unavailable targets, forces pending, locks each attempt and resets without affecting published ratings", async () => {
  const seed = getDemoSessionSeed();
  const eligibleIds = (await demoDirectory.listPublic()).map(
    (profile) => profile.id,
  );
  let state = createDemoSession(seed, [], eligibleIds);
  const invalid = {
    type: "submit-review" as const,
    professionalId: "demo-suspended",
    fields,
  };
  assert.equal(reduceDemoSession(state, invalid, seed), state);
  assert.equal(
    reduceDemoSession(
      state,
      {
        ...invalid,
        professionalId: target,
        fields: { ...fields, body: "short" },
      },
      seed,
    ),
    state,
  );
  const action = {
    type: "submit-review" as const,
    professionalId: target,
    fields: {
      ...fields,
      professionalId: "demo-pending",
      status: "published",
      verified: true,
      internalNote: "forged",
    },
  };
  state = reduceDemoSession(state, action, seed);
  assert.deepEqual(state.reviews.submissions, [
    {
      id: "demo-session-review-1",
      professionalId: target,
      ...fields,
      status: "pending",
    },
  ]);
  assert.equal(reduceDemoSession(state, action, seed), state);
  const original = state.reviews;
  state = reduceDemoSession(
    state,
    {
      type: "demo-sign-in",
      fields: { email: "admin@example.invalid", passcode: "home-demo" },
    },
    seed,
  );
  state = reduceDemoSession(state, { type: "demo-sign-out" }, seed);
  assert.equal(state.reviews, original);
  state = reduceDemoSession(
    state,
    { type: "submit-review", professionalId: "demo-mold-remediation", fields },
    seed,
  );
  assert.equal(state.reviews.submissions.length, 2);
  state = reduceDemoSession(
    state,
    { type: "new-review", professionalId: target },
    seed,
  );
  state = reduceDemoSession(state, action, seed);
  assert.equal(state.reviews.submissions[2].id, "demo-session-review-3");
  assert.deepEqual(
    summarizeReviews((await demoReviewRepository.listPublic(target))!),
    { count: 4, average: 4.5 },
  );
  state = reduceDemoSession(state, { type: "reset" }, seed);
  assert.equal(state.identity, null);
  assert.deepEqual(state.reviews.submissions, []);
  assert.deepEqual(state.reviews.currentByProfessional, {});
  assert.deepEqual(state.publicProfessionalIds, eligibleIds);
  assert.equal(
    reduceDemoSession(state, action, seed).reviews.submissions.length,
    1,
  );
});
