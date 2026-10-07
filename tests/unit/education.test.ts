import { test } from "node:test";
import assert from "node:assert/strict";
import { categories } from "../../src/domain/categories";
import {
  educationPathways,
  getEducationPathways,
} from "../../src/data/content/education";

test("education covers exactly the eight catalog IDs with explicit program limits and official HTTPS references", () => {
  assert.deepEqual(
    Object.keys(educationPathways).sort(),
    categories.map((category) => category.id).sort(),
  );
  for (const { pathway } of getEducationPathways(categories)) {
    assert.ok(pathway);
    assert.ok(pathway.introduction);
    assert.ok(pathway.steps.length >= 3);
    assert.match(pathway.timeline, /To be confirmed/);
    assert.match(pathway.costs, /To be confirmed/);
    assert.ok(pathway.options.length > 0);
    for (const option of pathway.options) {
      assert.equal(new URL(option.href).protocol, "https:");
      assert.ok(option.kind);
      assert.ok(option.description);
    }
  }
});
test("category reordering and renaming cannot change education associations or catalog prices", () => {
  const reordered = [...categories]
    .reverse()
    .map((category) => ({ ...category, name: `Changed ${category.id}` }));
  for (const { category, pathway } of getEducationPathways(reordered)) {
    assert.equal(pathway, educationPathways[category.id]);
    assert.equal(
      category.monthlyUsd,
      categories.find((entry) => entry.id === category.id)!.monthlyUsd,
    );
  }
  assert.deepEqual(
    Object.fromEntries(
      categories.map(({ id, monthlyUsd }) => [id, monthlyUsd]),
    ),
    {
      "mold-inspection": 79,
      "mold-remediation": 129,
      "healthy-renovations": 129,
      "healthy-builders": 200,
      "healthy-trades": 129,
      "healthy-designers": 129,
      "health-practitioners": 129,
      "mold-detection-dogs": 79,
    },
  );
});
test("unmapped future category has no fabricated provider, cost or timeline", () => {
  const [{ pathway }] = getEducationPathways([
    { ...categories[0], id: "future-specialty" },
  ]);
  assert.equal(pathway, undefined);
});
