import { test } from "node:test";
import assert from "node:assert/strict";
import { demoDirectory } from "../../src/data/demo/repository";
import { demoReviewRepository } from "../../src/data/demo/review-repository";
import { demoProfessionals } from "../../src/data/demo/fixtures";
import { listPublicProfessionals } from "../../src/domain/listing";
import { homeStatistics } from "../../src/domain/home-statistics";
import {
  createReviewSession,
  reduceReviewAction,
} from "../../src/domain/review-session";
import type { PublicReview } from "../../src/domain/review";
import { demoAccounts } from "../../src/domain/demo-identity";

test("homepage statistics use eligible public listings and individual published ratings", async () => {
  const [listings, snapshot] = await Promise.all([
    demoDirectory.listPublic(),
    demoReviewRepository.publicSnapshot(),
  ]);
  const ids = snapshot.professionals.map(({ id }) => id);
  const stats = homeStatistics(listings, createReviewSession(snapshot), ids);
  assert.equal(stats.professionals, 8);
  assert.equal(stats.reviewCount, 6);
  assert.equal(stats.average, 4.2); // (5 + 4 + 4 + 5 + 4 + 3) / 6, not (4.5 + 4 + 3) / 3.
  assert.equal(stats.missingStates, 0);
  const hiddenOnly = listPublicProfessionals(
    demoProfessionals.filter(({ id }) => !ids.includes(id)),
  );
  assert.deepEqual(hiddenOnly, []);
  assert.equal(
    homeStatistics(
      [...listings, { id: "demo-pending", state: "ZZ" }],
      createReviewSession(snapshot),
      ids,
    ).states,
    stats.states,
  );
  assert.deepEqual(Object.keys(stats).sort(), [
    "average",
    "missingStates",
    "professionals",
    "reviewCount",
    "states",
  ]);
});

test("statistics handle zero listings, absent states and duplicate public IDs honestly", () => {
  const session = createReviewSession();
  assert.deepEqual(homeStatistics([], session, []), {
    professionals: 0,
    states: 0,
    missingStates: 0,
    reviewCount: 0,
    average: null,
  });
  const listings = [
    { id: "a", state: " nc " },
    { id: "b", state: "NC" },
    { id: "c", state: "  " },
    { id: "d", state: "TX" },
  ];
  const stats = homeStatistics([...listings, listings[0]], session, [
    "a",
    "b",
    "c",
    "d",
  ]);
  assert.deepEqual(stats, {
    professionals: 4,
    states: 2,
    missingStates: 1,
    reviewCount: 0,
    average: null,
  });
  assert.equal(
    homeStatistics([{ id: "c", state: "" }], session, ["c"]).states,
    0,
  );
});

test("homepage averages remain weighted when professional review counts differ", () => {
  const reviews: PublicReview[] = [5, 5, 5, 1].map((rating, index) => ({
    id: `r-${index}`,
    professionalId: index === 3 ? "b" : "a",
    displayName: "Sample",
    rating: rating as 1 | 5,
    body: "Fictional example",
    publishedAt: "2026-10-01",
  }));
  const session = createReviewSession({
    professionals: [
      { id: "a", businessName: "A" },
      { id: "b", businessName: "B" },
    ],
    reviews,
  });
  const stats = homeStatistics(
    [
      { id: "a", state: "NC" },
      { id: "b", state: "TX" },
    ],
    session,
    ["a", "b"],
  );
  assert.equal(stats.average, 4);
  assert.equal(stats.reviewCount, 4);
});

test("homepage follows shared pending, publish, reject, repeated decisions and reset calculations", async () => {
  const snapshot = await demoReviewRepository.publicSnapshot();
  const listings = await demoDirectory.listPublic();
  const ids = snapshot.professionals.map(({ id }) => id);
  const seed = createReviewSession(snapshot);
  const admin = demoAccounts(null).find(
    ({ identity }) => identity.kind === "admin",
  )!.identity;
  let session = reduceReviewAction(
    seed,
    {
      type: "submit-review",
      professionalId: "demo-mold-inspection",
      fields: {
        displayName: "Sample",
        rating: 1,
        body: "A fictional service conversation for this example.",
      },
    },
    ids,
  );
  assert.equal(homeStatistics(listings, session, ids).average, 4.2);
  const decision = {
    type: "moderate-review" as const,
    id: session.submissions[0].id,
    status: "published" as const,
    note: "INTERNAL_ONLY",
  };
  session = reduceReviewAction(session, decision, ids, admin);
  assert.equal(homeStatistics(listings, session, ids).average, 3.7);
  assert.equal(homeStatistics(listings, session, ids).reviewCount, 7);
  assert.equal(reduceReviewAction(session, decision, ids, admin), session);
  session = reduceReviewAction(
    session,
    { ...decision, status: "rejected" },
    ids,
    admin,
  );
  assert.equal(homeStatistics(listings, session, ids).average, 4.2);
  assert.equal(
    JSON.stringify(homeStatistics(listings, session, ids)).includes(
      "INTERNAL_ONLY",
    ),
    false,
  );
  assert.deepEqual(
    homeStatistics(listings, createReviewSession(snapshot), ids),
    homeStatistics(listings, seed, ids),
  );
});
