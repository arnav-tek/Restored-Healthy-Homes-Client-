import { test } from "node:test";
import assert from "node:assert/strict";
import { categories } from "../../src/domain/categories";
import {
  isPubliclyEligible,
  isFeaturedEligible,
  listPublicProfessionals,
  toPublicProfessional,
} from "../../src/domain/listing";
import { demoProfessionals } from "../../src/data/demo/fixtures";
import { parseDirectoryQuery } from "../../src/validation/directory";
import { assertDemoConfiguration } from "../../src/domain/config";
import type {
  ApprovalStatus,
  SubscriptionStatus,
} from "../../src/domain/professional";

test("exact agreed categories and monthly USD prices; unique stable IDs and billing keys", () => {
  assert.deepEqual(
    categories.map(({ name, monthlyUsd }) => [name, monthlyUsd]),
    [
      ["Mold Testing / Inspectors", 79],
      ["Mold Remediation", 129],
      ["Healthy Home Renovations", 129],
      ["Healthy Home Builders", 200],
      ["Healthy Home Trades", 129],
      ["Healthy Home Designers", 129],
      ["Health Practitioners (Physicians, Nutritionists, Naturopaths)", 129],
      ["Mold Detection Dogs", 79],
    ],
  );
  assert.equal(new Set(categories.map((category) => category.id)).size, 8);
  assert.equal(
    new Set(categories.map((category) => category.billingKey)).size,
    8,
  );
  for (const record of demoProfessionals)
    for (const id of record.categoryIds)
      assert.ok(categories.some((category) => category.id === id));
});
test("all approval, subscription and suspension combinations fail closed", () => {
  const approvals: ApprovalStatus[] = ["approved", "pending", "rejected"];
  const subscriptions: SubscriptionStatus[] = [
    "active",
    "inactive",
    "past_due",
    "canceled",
    "trialing",
    "unpaid",
  ];
  for (const approval of approvals)
    for (const subscription of subscriptions)
      for (const suspended of [false, true]) {
        assert.equal(
          isPubliclyEligible({ approval, subscription, suspended }),
          approval === "approved" && subscription === "active" && !suspended,
        );
      }
});
test("fixtures cover every category; all non-public fixture states are excluded", () => {
  const visible = listPublicProfessionals(demoProfessionals);
  assert.equal(visible.length, 8);
  assert.ok(
    visible.every((item) => !item.businessName.includes("Example Practice")),
  );
  for (const category of categories)
    assert.equal(
      listPublicProfessionals(demoProfessionals, category.id).length,
      1,
    );
  assert.deepEqual(listPublicProfessionals(demoProfessionals, "unknown"), []);
});
test("renaming categories preserves associations and billing configuration", () => {
  const renamed = categories.map((item, index) =>
    index === 0 ? { ...item, name: "Renamed display label" } : item,
  );
  const before = listPublicProfessionals(demoProfessionals, categories[0].id);
  const after = listPublicProfessionals(demoProfessionals, renamed[0].id);
  assert.deepEqual(after, before);
  assert.equal(renamed[0].monthlyUsd, categories[0].monthlyUsd);
  assert.equal(renamed[0].billingKey, categories[0].billingKey);
  assert.deepEqual(parseDirectoryQuery(categories[0].id, renamed), {
    valid: true,
    categoryId: categories[0].id,
  });
});
test("public projection is an exact allowlist and includes only verified credentials", () => {
  const record = {
    ...demoProfessionals[0],
    futurePrivateField: "must-not-leak",
  };
  const publicRecord = toPublicProfessional(record);
  assert.deepEqual(
    Object.keys(publicRecord).sort(),
    [
      "id",
      "businessName",
      "categoryIds",
      "city",
      "state",
      "specialty",
      "summary",
      "services",
      "verifiedCredentials",
    ].sort(),
  );
  assert.ok(!JSON.stringify(publicRecord).includes("synthetic-owner"));
  assert.ok(!JSON.stringify(publicRecord).includes("must-not-leak"));
  assert.deepEqual(
    toPublicProfessional(demoProfessionals[1]).verifiedCredentials,
    [],
  );
  publicRecord.categoryIds.push("changed");
  assert.equal(record.categoryIds.length, 1);
});
test("certification and featured state do not grant listing eligibility; payment never clears suspension", () => {
  const record = {
    ...demoProfessionals[0],
    suspended: true,
    subscription: "active" as const,
    featuredEntitlement: "active" as const,
  };
  assert.equal(isPubliclyEligible(record), false);
  assert.equal(isFeaturedEligible(record), false);
  const withoutCredentials = { ...record, suspended: false, credentials: [] };
  assert.equal(isPubliclyEligible(withoutCredentials), true);
});
test("a professional may be associated with multiple categories without inventing billing math", () => {
  const record = {
    ...demoProfessionals[0],
    categoryIds: [categories[0].id, categories[1].id],
  };
  for (const categoryId of record.categoryIds)
    assert.equal(
      listPublicProfessionals([record], categoryId)[0].id,
      record.id,
    );
});
test("query validation rejects arrays, display names, unknown and oversized values", () => {
  for (const value of [
    [categories[0].id],
    "x".repeat(81),
    "unknown",
    categories[0].name,
  ])
    assert.deepEqual(parseDirectoryQuery(value, categories), { valid: false });
  assert.deepEqual(parseDirectoryQuery(undefined, categories), { valid: true });
});
test("demo mode cannot silently become production authorization", () => {
  assert.doesNotThrow(() =>
    assertDemoConfiguration({ NODE_ENV: "development" }),
  );
  assert.doesNotThrow(() =>
    assertDemoConfiguration({ NODE_ENV: "production", RHH_APP_MODE: "demo" }),
  );
  assert.throws(() => assertDemoConfiguration({ NODE_ENV: "production" }));
  assert.throws(() => assertDemoConfiguration({ RHH_APP_MODE: "live" }));
  assert.throws(() =>
    assertDemoConfiguration({ RHH_APP_MODE: "demo", VERCEL_ENV: "production" }),
  );
  assert.throws(() =>
    assertDemoConfiguration({ RHH_APP_MODE: "anything-else" }),
  );
});
