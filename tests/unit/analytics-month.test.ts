import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAnalyticsMonth } from "../../src/validation/admin-showcase";

test("analytics accepts complete calendar months and rejects incomplete or impossible periods", () => {
  for (const month of ["0001-01", "2000-12", "2026-10", "9999-12"])
    assert.equal(parseAnalyticsMonth(month), month);
  for (const month of [
    "",
    "2",
    "2000-0",
    "2000-00",
    "2000-13",
    "0000-01",
    "10000-01",
    "2026-1",
    "2026-10-01",
    null,
    202610,
  ])
    assert.equal(parseAnalyticsMonth(month), null);
});
