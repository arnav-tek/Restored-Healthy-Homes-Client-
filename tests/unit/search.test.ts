import { test } from "node:test";
import assert from "node:assert/strict";
import { categories } from "../../src/domain/categories";
import {
  defaultSearch,
  directoryHref,
  searchPublicDirectory,
} from "../../src/domain/directory-search";
import { parseSearchQuery } from "../../src/validation/directory";
import { demoDirectory } from "../../src/data/demo/repository";
import {
  demoLocations,
  demoLocationAdapter,
} from "../../src/data/demo/locations";
import { searchEligiblePublic } from "../../src/data/search-service";
import { approximateMiles } from "../../src/domain/location";
import { listPublicProfessionals } from "../../src/domain/listing";
import { demoProfessionals } from "../../src/data/demo/fixtures";
import { demoReviewRepository } from "../../src/data/demo/review-repository";
import {
  createReviewSession,
  publicSessionReviews,
  type ReviewSession,
} from "../../src/domain/review-session";
import { safeDirectoryReturn } from "../../src/validation/profile";
const publicRecords = listPublicProfessionals(demoProfessionals);
const raleigh = demoLocations.find((place) => place.id === "raleigh-nc")!;

test("URL parser bounds and normalizes filters without unsafe fallback results", () => {
  const parsed = parseSearchQuery(
    {
      q: "  Mold   sampling ",
      category: "mold-inspection",
      location: " Asheville, NC ",
      radius: "050",
      sort: "nearest",
      page: "2",
    },
    categories,
  );
  assert.deepEqual(parsed.errors, {});
  assert.equal(
    directoryHref(parsed.query),
    "/directory?q=Mold+sampling&category=mold-inspection&location=Asheville%2C+NC&radius=50&sort=nearest&page=2",
  );
  assert.deepEqual(parseSearchQuery({}, categories), {
    query: defaultSearch,
    errors: {},
  });
  for (const field of ["q", "category", "location", "radius", "sort", "page"])
    assert.ok(
      parseSearchQuery({ [field]: ["a", "b"] }, categories).errors[
        field as keyof typeof parsed.errors
      ],
    );
  for (const radius of ["0", "-1", "1.5", "501", "NaN", "Infinity", "1e2"])
    assert.ok(
      parseSearchQuery({ location: "Raleigh", radius }, categories).errors
        .radius,
    );
  for (const page of ["0", "-1", "1.2", "10001", "999999999999", "NaN", "01"])
    assert.ok(parseSearchQuery({ page }, categories).errors.page);
  assert.ok(parseSearchQuery({ q: "a".repeat(101) }, categories).errors.q);
  assert.ok(
    parseSearchQuery({ location: "a".repeat(81) }, categories).errors.location,
  );
  assert.ok(parseSearchQuery({ radius: "50" }, categories).errors.location);
  assert.ok(parseSearchQuery({ sort: "nearest" }, categories).errors.location);
  assert.ok(
    parseSearchQuery(
      { sort: "rating", category: "Air Quality Testing" },
      categories,
    ).errors.category,
  );
  assert.equal(
    directoryHref(
      parseSearchQuery({ page: "1", unexpected: "ignored" }, categories).query,
    ),
    "/directory",
  );
});

test("city/ZIP adapter resolves exact supported values, ambiguity and leading-zero ZIP", async () => {
  assert.equal(
    (await demoLocationAdapter.resolve("  RALEIGH,   nc ")).status,
    "resolved",
  );
  const zip = await demoLocationAdapter.resolve("04101");
  assert.equal(zip.status, "resolved");
  if (zip.status === "resolved") assert.equal(zip.location.state, "ME");
  const ambiguous = await demoLocationAdapter.resolve("Portland");
  assert.equal(ambiguous.status, "ambiguous");
  if (ambiguous.status === "ambiguous")
    assert.equal(ambiguous.candidates.length, 2);
  for (const input of ["99999", "Rale", "NC", "27601-1234", "New York"])
    assert.equal(
      (await demoLocationAdapter.resolve(input)).status,
      "unsupported",
    );
});

test("approximate distance handles zero, dateline, antipodes and invalid coordinates", () => {
  const origin = { latitude: 0, longitude: 0 };
  assert.equal(approximateMiles(origin, origin), 0);
  assert.ok(
    Math.abs(
      approximateMiles(origin, { latitude: 0, longitude: 1 })! - 69.0934,
    ) < 0.01,
  );
  assert.ok(
    approximateMiles(
      { latitude: 0, longitude: 179 },
      { latitude: 0, longitude: -179 },
    )! < 139,
  );
  assert.ok(
    Number.isFinite(approximateMiles(origin, { latitude: 0, longitude: 180 })),
  );
  for (const latitude of [91, -91, NaN, Infinity])
    assert.equal(
      approximateMiles(origin, { latitude, longitude: 0 }),
      undefined,
    );
});

test("eligibility and projection precede keyword, counts, sort and pagination", async () => {
  const first = await demoDirectory.search(defaultSearch);
  assert.ok(first.ok);
  if (!first.ok) return;
  assert.equal(first.results.total, 8);
  assert.equal(first.results.hits.length, 6);
  assert.equal(first.results.pages, 2);
  const second = await demoDirectory.search({ ...defaultSearch, page: 2 });
  assert.ok(second.ok);
  if (!second.ok) return;
  const names = [...first.results.hits, ...second.results.hits].map(
    (hit) => hit.professional.businessName,
  );
  assert.equal(new Set(names).size, 8);
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b, "en-US")),
  );
  for (const keyword of ["Example Practice", "synthetic", "internalNotes"]) {
    const hidden = await demoDirectory.search({ ...defaultSearch, q: keyword });
    assert.ok(hidden.ok && hidden.results.total === 0);
  }
  for (const hit of first.results.hits)
    assert.deepEqual(Object.keys(hit).sort(), [
      "professional",
      "reviewSummary",
    ]);
  const last = await demoDirectory.search({ ...defaultSearch, page: 10000 });
  assert.ok(last.ok && last.results.page === 2);
});

test("state and minimum-rating URL validation rejects duplicate/invalid filters and preserves safe returns", () => {
  const parsed = parseSearchQuery(
    { state: " nc ", minRating: "4.5", sort: "za", page: "2" },
    categories,
  );
  assert.deepEqual(parsed.errors, {});
  assert.equal(
    directoryHref(parsed.query),
    "/directory?state=NC&minRating=4.5&sort=za&page=2",
  );
  assert.equal(
    safeDirectoryReturn("/directory?state=nc&minRating=4.5&page=2", categories),
    "/directory?state=NC&minRating=4.5&page=2",
  );
  for (const state of ["XX", "North Carolina", "<script>", ["NC", "TX"]])
    assert.ok(parseSearchQuery({ state }, categories).errors.state);
  for (const minRating of [
    "0",
    "6",
    "3.5",
    "4.6",
    "NaN",
    "Infinity",
    "4e0",
    "04",
    ["4", "5"],
  ])
    assert.ok(parseSearchQuery({ minRating }, categories).errors.minRating);
  for (const minRating of ["1", "2", "3", "4", "4.5", "5"])
    assert.deepEqual(parseSearchQuery({ minRating }, categories).errors, {});
});

test("published rating boundaries exclude unrated and ineligible listings before counts and pagination", async () => {
  const found = await demoDirectory.search({ ...defaultSearch, minRating: 4 });
  assert.ok(found.ok);
  if (!found.ok) return;
  assert.equal(found.results.total, 2);
  assert.deepEqual(
    found.results.hits.map((hit) => hit.reviewSummary),
    [
      { count: 4, average: 4.5 },
      { count: 1, average: 4 },
    ],
  );
  const exact = await demoDirectory.search({
    ...defaultSearch,
    state: "NC",
    minRating: 4.5,
    page: 10000,
  });
  assert.ok(exact.ok && exact.results.total === 1 && exact.results.page === 1);
  const five = await demoDirectory.search({ ...defaultSearch, minRating: 5 });
  assert.ok(five.ok && five.results.total === 0);
  const any = await demoDirectory.search({ ...defaultSearch, state: "TX" });
  assert.ok(any.ok && any.results.hits[0].reviewSummary.average === null);
  assert.ok(!JSON.stringify(found).includes("REVIEW_PRIVATE"));
});

test("state composes with category, city/radius and ratings rather than overriding any filter", async () => {
  const query = {
    ...defaultSearch,
    location: "27601",
    radius: 250,
    state: "NC",
    minRating: 4,
  };
  const found = await demoDirectory.search(query);
  assert.ok(
    found.ok &&
      found.results.total === 1 &&
      found.results.hits[0].professional.id === "demo-mold-inspection",
  );
  for (const filter of [
    { state: "TX" },
    { category: "healthy-trades" },
    { radius: undefined },
  ]) {
    const empty = await demoDirectory.search({ ...query, ...filter });
    assert.ok(empty.ok && empty.results.total === 0);
  }
  const unsupported = await demoDirectory.search({
    ...query,
    location: "99999",
  });
  assert.ok(!unsupported.ok && unsupported.errors.location);
});

test("same-session published review changes drive directory ratings, thresholds and pages", async () => {
  const snapshot = await demoReviewRepository.publicSnapshot();
  const initial = createReviewSession(snapshot);
  const ids = publicRecords.map(({ id }) => id);
  const calculate = (session: ReviewSession, minRating: number, page = 1) =>
    searchPublicDirectory(
      publicRecords,
      categories,
      { ...defaultSearch, minRating, page },
      demoLocations,
      undefined,
      ids.flatMap((id) => publicSessionReviews(session, ids, id)),
    );
  assert.equal(calculate(initial, 4.5).total, 1);
  const rejected: ReviewSession = {
    ...initial,
    decisions: {
      "sample-inspection-plan": {
        status: "rejected",
        note: "PRIVATE",
        publishedAt: "",
      },
    },
  };
  assert.equal(calculate(rejected, 4.5).total, 0);
  // New published records on all eligible businesses must filter before paging.
  const submissions = ids.map((professionalId, index) => ({
    id: `session-${index}`,
    professionalId,
    displayName: "Visitor",
    rating: 5 as const,
    body: "A synthetic review for the pagination boundary.",
    status: "pending" as const,
  }));
  const pending = { ...initial, submissions };
  assert.equal(calculate(pending, 1).total, 3);
  const published = {
    ...pending,
    decisions: Object.fromEntries(
      submissions.map(({ id }) => [
        id,
        {
          status: "published" as const,
          note: "PRIVATE",
          publishedAt: "2026-10-07",
        },
      ]),
    ),
  };
  const second = calculate(published, 1, 2);
  assert.equal(second.total, 8);
  assert.equal(second.pages, 2);
  assert.equal(second.hits.length, 2);
  assert.equal(calculate(initial, 1, 2).page, 1);
  assert.ok(!JSON.stringify(second).includes("PRIVATE"));
});

test("keyword matches public services/categories, combines filters and sorts reverse", async () => {
  const found = await demoDirectory.search({
    ...defaultSearch,
    q: "MOLD sampling",
    category: "mold-inspection",
    location: "28801",
  });
  assert.ok(found.ok && found.results.total === 1);
  const empty = await demoDirectory.search({
    ...defaultSearch,
    q: "sampling",
    category: "healthy-builders",
  });
  assert.ok(empty.ok && empty.results.total === 0);
  const reverse = await demoDirectory.search({ ...defaultSearch, sort: "za" });
  assert.ok(
    reverse.ok &&
      reverse.results.hits[0].professional.businessName ===
        "Willow Home Trades",
  );
});

test("location defaults to same city; radius expands and nearest sorts by unrounded distance", async () => {
  const city = await demoDirectory.search({
    ...defaultSearch,
    location: "Raleigh",
  });
  assert.ok(city.ok && city.results.total === 1);
  const nearby = await demoDirectory.search({
    ...defaultSearch,
    location: "27601",
    radius: 250,
    sort: "nearest",
  });
  assert.ok(nearby.ok);
  if (!nearby.ok) return;
  assert.deepEqual(
    nearby.results.hits.map((hit) => hit.professional.city),
    ["Raleigh", "Richmond", "Asheville"],
  );
  assert.equal(nearby.results.hits[0].distanceMiles, 0);
  const roundRock = await demoDirectory.search({
    ...defaultSearch,
    location: "78664",
    radius: 25,
  });
  assert.ok(
    roundRock.ok && roundRock.results.hits[0].professional.city === "Austin",
  );
  const unsupported = await demoDirectory.search({
    ...defaultSearch,
    location: "unknown",
  });
  assert.ok(!unsupported.ok && unsupported.errors.location);
  const ambiguous = await demoDirectory.search({
    ...defaultSearch,
    location: "Portland",
  });
  assert.ok(!ambiguous.ok && ambiguous.suggestions?.length === 2);
});

test("radius boundary is inclusive and missing coordinates never become zero distance", () => {
  const hit = publicRecords.find((record) => record.city === "Asheville")!;
  const place = demoLocations.find(
    (location) => location.city === "Asheville",
  )!;
  const distance = approximateMiles(raleigh.coordinates, place.coordinates)!;
  assert.equal(
    searchPublicDirectory(
      [hit],
      categories,
      { ...defaultSearch, radius: distance },
      demoLocations,
      raleigh,
    ).total,
    1,
  );
  assert.equal(
    searchPublicDirectory(
      [hit],
      categories,
      { ...defaultSearch, radius: distance - 0.001 },
      demoLocations,
      raleigh,
    ).total,
    0,
  );
  const noCoordinates = searchPublicDirectory(
    [hit],
    categories,
    { ...defaultSearch, radius: 500 },
    [],
    raleigh,
  );
  assert.equal(noCoordinates.total, 0);
  assert.equal(noCoordinates.missingCoordinates, 1);
});

test("replaceable location adapter failures propagate, never produce an unfiltered success", async () => {
  await assert.rejects(
    searchEligiblePublic(
      publicRecords,
      categories,
      { ...defaultSearch, location: "Raleigh" },
      {
        resolve: async () => {
          throw new Error("Location lookup unavailable");
        },
        listSupported: async () => [],
      },
    ),
    /Location lookup unavailable/,
  );
});
