import { test } from "node:test";
import assert from "node:assert/strict";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import {
  createDemoSession,
  reduceDemoSession,
  memberFormFields,
  type DemoMemberAction,
} from "../../src/domain/demo-member";
import {
  publicApplicationProfile,
  withPublicApplication,
  isPublicApplicationId,
  isSessionCategoryId,
  publicDirectoryCatalog,
} from "../../src/domain/public-application";
import {
  searchPublicDirectory,
  defaultSearch,
} from "../../src/domain/directory-search";
import { categories } from "../../src/domain/categories";
import { safeDirectoryReturn } from "../../src/validation/profile";

function application() {
  const seed = getDemoSessionSeed();
  let state = createDemoSession(seed);
  const act = (action: DemoMemberAction) => {
    state = reduceDemoSession(state, action, seed);
  };
  act({
    type: "submit",
    profile: {
      ...memberFormFields(seed.records[0]),
      name: "PRIVATE OWNER",
      email: "private-owner@example.invalid",
      businessName: "Public Journey Studio",
    },
  });
  const id = state.applicationId!;
  const admin = () =>
    act({
      type: "demo-sign-in",
      fields: { email: "admin@example.invalid", passcode: "home-access" },
    });
  return {
    get state() {
      return state;
    },
    act,
    id,
    admin,
  };
}
test("public application needs approval AND active membership AND no suspension; payment cannot undo decisions", () => {
  const demo = application();
  assert.equal(publicApplicationProfile(demo.state), null);
  demo.admin();
  demo.act({
    type: "simulate-membership",
    id: demo.id,
    status: "active",
    reason: "Payment example",
  });
  assert.equal(publicApplicationProfile(demo.state), null);
  demo.act({
    type: "decide",
    id: demo.id,
    approval: "approved",
    reason: "Reviewed application",
  });
  assert.equal(
    publicApplicationProfile(demo.state)?.businessName,
    "Public Journey Studio",
  );
  for (const status of [
    "inactive",
    "past_due",
    "canceled",
    "trialing",
    "unpaid",
  ] as const) {
    demo.act({
      type: "simulate-membership",
      id: demo.id,
      status,
      reason: "Status example",
    });
    assert.equal(publicApplicationProfile(demo.state), null);
  }
  demo.act({
    type: "simulate-membership",
    id: demo.id,
    status: "active",
    reason: "Payment example",
  });
  demo.act({
    type: "suspend",
    id: demo.id,
    suspended: true,
    reason: "Private suspension reason",
  });
  demo.act({
    type: "simulate-membership",
    id: demo.id,
    status: "active",
    reason: "Payment example",
  });
  assert.equal(publicApplicationProfile(demo.state), null);
  demo.act({
    type: "suspend",
    id: demo.id,
    suspended: false,
    reason: "Reviewed reinstatement",
  });
  demo.act({
    type: "decide",
    id: demo.id,
    approval: "rejected",
    reason: "Private decision reason",
  });
  assert.equal(publicApplicationProfile(demo.state), null);
});
test("public application projections exclude private contacts/notes; optional public fields are clearable and copies are detached", () => {
  const demo = application();
  demo.admin();
  demo.act({
    type: "decide",
    id: demo.id,
    approval: "approved",
    reason: "PRIVATE DECISION",
  });
  demo.act({
    type: "simulate-membership",
    id: demo.id,
    status: "active",
    reason: "PRIVATE SCENARIO",
  });
  const profile = publicApplicationProfile(demo.state)!;
  assert.equal(profile.contact.email, "");
  assert.equal(profile.publicDisplayName, undefined);
  const serialized = JSON.stringify(profile);
  for (const secret of [
    "PRIVATE OWNER",
    "private-owner@example.invalid",
    "PRIVATE DECISION",
    "PRIVATE SCENARIO",
    "subscription",
    "featuredEntitlement",
  ])
    assert.ok(!serialized.includes(secret));
  const record = demo.state.records.find((item) => item.id === demo.id)!;
  demo.act({
    type: "edit",
    id: demo.id,
    profile: {
      ...memberFormFields(record),
      publicDisplayName: "Public Owner",
      publicEmail: "public@example.invalid",
    },
  });
  const published = publicApplicationProfile(demo.state)!;
  assert.equal(published.contact.email, "public@example.invalid");
  assert.equal(published.publicDisplayName, "Public Owner");
  published.services.push("Mutated copy");
  published.categoryIds.length = 0;
  assert.notDeepEqual(
    published.services,
    publicApplicationProfile(demo.state)!.services,
  );
  assert.ok(publicApplicationProfile(demo.state)!.categoryIds.length > 0);
  const current = demo.state.records.find((item) => item.id === demo.id)!;
  demo.act({
    type: "edit",
    id: demo.id,
    profile: {
      ...memberFormFields(current),
      publicDisplayName: "",
      publicEmail: "",
    },
  });
  assert.equal(publicApplicationProfile(demo.state)!.contact.email, "");
  assert.equal(
    publicApplicationProfile(demo.state)!.publicDisplayName,
    undefined,
  );
});
test("publication changes no seed records, survives sign-out only in the current session and clears on reset", () => {
  const demo = application();
  demo.admin();
  const seedBefore = structuredClone(
    demo.state.records.filter((item) => item.id !== demo.id),
  );
  demo.act({
    type: "decide",
    id: demo.id,
    approval: "approved",
    reason: "Review complete",
  });
  demo.act({
    type: "simulate-membership",
    id: demo.id,
    status: "active",
    reason: "Payment example",
  });
  demo.act({ type: "demo-sign-out" });
  const cards = withPublicApplication([], demo.state);
  assert.equal(cards.length, 1);
  assert.ok(!("contact" in cards[0]));
  assert.deepEqual(
    demo.state.records.filter((item) => item.id !== demo.id),
    seedBefore,
  );
  assert.equal(
    searchPublicDirectory(
      cards,
      categories,
      { ...defaultSearch, q: "Journey", state: "NC" },
      [],
    ).total,
    1,
  );
  assert.equal(
    searchPublicDirectory(
      cards,
      categories,
      { ...defaultSearch, minRating: 1 },
      [],
    ).total,
    0,
  );
  demo.act({ type: "reset" });
  assert.equal(publicApplicationProfile(demo.state), null);
  assert.deepEqual(withPublicApplication([], demo.state), []);
  assert.equal(
    publicApplicationProfile(createDemoSession(getDemoSessionSeed())),
    null,
  );
});
test("only the exact reserved route and bounded session category IDs are recognized", () => {
  assert.equal(isPublicApplicationId("demo-local-application"), true);
  for (const id of [
    "member-example-approved",
    "demo-local-application-extra",
    "demo-local-application/",
    "unknown",
  ])
    assert.equal(isPublicApplicationId(id), false);
  assert.equal(isSessionCategoryId("demo-category-12"), true);
  for (const id of [
    "demo-category-0",
    "demo-category-01",
    "demo-category-12345678901",
    ["demo-category-1"],
    undefined,
  ])
    assert.equal(isSessionCategoryId(id), false);
});

test("public catalog uses accepted labels while preserving IDs and prices; new category search/returns, city matching and extra pagination share the public pipeline", () => {
  const demo = application();
  demo.admin();
  demo.act({
    type: "create-category",
    fields: {
      name: "New Public Specialty",
      description: "A specialty used to check the public catalog.",
      monthlyUsd: 123,
    },
  });
  const category = demo.state.addedCategories[0];
  demo.act({
    type: "rename-category",
    id: categories[0].id,
    name: "Local editor label",
  });
  const catalog = publicDirectoryCatalog(categories, demo.state);
  assert.equal(catalog[0].name, "Local editor label");
  assert.equal(catalog[0].monthlyUsd, categories[0].monthlyUsd);
  assert.equal(catalog[0].billingKey, categories[0].billingKey);
  assert.equal(catalog.at(-1)?.id, category.id);
  const current = demo.state.records.find((item) => item.id === demo.id)!;
  demo.act({
    type: "edit",
    id: demo.id,
    profile: {
      ...memberFormFields(current),
      city: "rAlEiGh",
      categoryIds: [category.id],
    },
  });
  demo.act({
    type: "decide",
    id: demo.id,
    approval: "approved",
    reason: "Review complete",
  });
  demo.act({
    type: "simulate-membership",
    id: demo.id,
    status: "active",
    reason: "Payment example",
  });
  const cards = withPublicApplication([], demo.state);
  const place = {
    id: "raleigh",
    city: "Raleigh",
    state: "NC",
    zip: "27601",
    coordinates: { latitude: 35.78, longitude: -78.64 },
  };
  assert.equal(
    searchPublicDirectory(
      cards,
      catalog,
      { ...defaultSearch, category: category.id, location: "27601" },
      [place],
      place,
    ).total,
    1,
  );
  assert.equal(
    searchPublicDirectory(
      cards,
      catalog,
      { ...defaultSearch, radius: 1, location: "27601" },
      [place],
      place,
    ).hits[0].distanceMiles,
    0,
  );
  const seven = [
    ...Array.from({ length: 6 }, (_, i) => ({
      ...cards[0],
      id: `seed-${i}`,
      businessName: `A sample ${i}`,
    })),
    ...cards,
  ];
  const last = searchPublicDirectory(
    seven,
    catalog,
    { ...defaultSearch, page: 2 },
    [],
  );
  assert.equal(last.pages, 2);
  assert.equal(last.hits[0].professional.id, demo.id);
  assert.equal(
    safeDirectoryReturn(`/directory?category=${category.id}&page=2`, catalog),
    `/directory?category=${category.id}&page=2`,
  );
  assert.equal(
    safeDirectoryReturn("//outside.invalid/directory", catalog),
    "/directory",
  );
  assert.equal(
    safeDirectoryReturn("/directory?category=demo-category-9999", catalog),
    "/directory",
  );
});
