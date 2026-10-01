import { test } from "node:test";
import assert from "node:assert/strict";
import { categories, type Category } from "../../src/domain/categories";
import { listPublicProfessionals } from "../../src/domain/listing";
import {
  defaultSearch,
  searchPublicDirectory,
} from "../../src/domain/directory-search";

test("catalog reordering before fixture construction preserves every category association", async () => {
  // This test file runs in its own Node test process. Change catalog order before
  // loading fixtures so the regression catches positional assignments at creation.
  const reordered = categories as Category[];
  reordered.reverse();
  try {
    const { demoProfessionals } = await import("../../src/data/demo/fixtures");
    const expected = [
      ["demo-mold-inspection", "Fern & Field Inspections", "mold-inspection"],
      ["demo-mold-remediation", "Cedar Path Remediation", "mold-remediation"],
      [
        "demo-healthy-renovations",
        "Kindred Home Renovations",
        "healthy-renovations",
      ],
      ["demo-healthy-builders", "Hearthside Building Co.", "healthy-builders"],
      ["demo-healthy-trades", "Willow Home Trades", "healthy-trades"],
      ["demo-healthy-designers", "Softwood Design Studio", "healthy-designers"],
      [
        "demo-health-practitioners",
        "Whole Leaf Health Practice",
        "health-practitioners",
      ],
      [
        "demo-mold-detection-dogs",
        "Scout & Spruce Detection",
        "mold-detection-dogs",
      ],
      ["demo-pending", "Pending Example Practice", "mold-inspection"],
      ["demo-rejected", "Rejected Example Practice", "mold-remediation"],
      ["demo-suspended", "Suspended Example Practice", "healthy-renovations"],
      ["demo-inactive", "Inactive Example Practice", "healthy-builders"],
      ["demo-past-due", "Past Due Example Practice", "healthy-trades"],
      ["demo-canceled", "Canceled Example Practice", "healthy-designers"],
      ["demo-trialing", "Trialing Example Practice", "health-practitioners"],
      ["demo-unpaid", "Unpaid Example Practice", "mold-detection-dogs"],
    ];
    assert.deepEqual(
      demoProfessionals.map((record) => [
        record.id,
        record.businessName,
        ...record.categoryIds,
      ]),
      expected,
    );
    const publicRecords = listPublicProfessionals(demoProfessionals);
    for (const category of reordered) {
      const results = searchPublicDirectory(
        publicRecords,
        reordered,
        { ...defaultSearch, category: category.id },
        [],
      );
      assert.equal(results.total, 1);
      assert.equal(
        results.hits[0].professional.businessName,
        expected.find(([, , id]) => id === category.id)?.[1],
      );
    }
  } finally {
    reordered.reverse();
  }
});
