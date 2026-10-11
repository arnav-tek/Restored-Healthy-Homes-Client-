import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseDashboardQuery,
  dashboardHref,
} from "../../src/validation/dashboard";
import {
  demoDashboardCounts,
  createDemoSession,
  reduceDemoSession,
} from "../../src/domain/demo-member";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";

test("dashboard queries validate sections, filters, record IDs and category IDs without external destinations", () => {
  const defaults = parseDashboardQuery("admin", new URLSearchParams());
  assert.equal(defaults.section, "overview");
  for (const value of [
    "section=profile",
    "section=https://evil.invalid",
    "section=applications&section=listings",
    "section=unknown",
  ])
    assert.equal(
      parseDashboardQuery("admin", new URLSearchParams(value)).section,
      "overview",
    );
  for (const value of [
    "record=../private",
    "record=javascript:alert(1)",
    "record=a&record=b",
    `record=${"x".repeat(101)}`,
  ])
    assert.equal(
      parseDashboardQuery("admin", new URLSearchParams(value)).record,
      "",
    );
  const invalid = parseDashboardQuery(
    "admin",
    new URLSearchParams(
      `status=paid&suspension=yes&category=missing&q=${"x".repeat(121)}`,
    ),
  );
  assert.equal(invalid.status, "all");
  assert.equal(invalid.suspension, "all");
  assert.equal(invalid.category, "");
  assert.equal(invalid.q, "");
  const query = parseDashboardQuery(
    "admin",
    new URLSearchParams(
      "section=applications&q=Sample&status=pending&suspension=clear&record=member-example-pending&category=healthy-designers",
    ),
  );
  const detail = dashboardHref("admin", query);
  assert.equal(
    detail,
    "/demo/admin?section=applications&record=member-example-pending&category=healthy-designers&q=Sample&status=pending&suspension=clear",
  );
  const list = dashboardHref("admin", query, { record: "" });
  assert.ok(!list.includes("record="));
  assert.ok(list.includes("status=pending"));
  assert.equal(
    dashboardHref("member", query, { section: "profile" }),
    "/demo/member?section=profile&record=member-example-pending",
  );
  assert.equal(
    dashboardHref("admin", defaults, { section: "//evil.invalid" }),
    "/demo/admin",
  );
});
test("overview counts derive from shared records and update after protected decisions", () => {
  const seed = getDemoSessionSeed();
  const initial = reduceDemoSession(
    createDemoSession(seed),
    {
      type: "demo-sign-in",
      fields: { email: "admin@example.invalid", passcode: "home-access" },
    },
    seed,
  );
  assert.deepEqual(demoDashboardCounts(initial.records), {
    applications: 7,
    pending: 1,
    eligible: 4,
    suspended: 0,
    unverified: 4,
  });
  const reviewed = reduceDemoSession(
    initial,
    {
      type: "decide",
      id: "member-example-pending",
      approval: "approved",
      reason: "Sample reviewed",
    },
    seed,
  );
  assert.equal(demoDashboardCounts(reviewed.records).pending, 0);
  assert.equal(demoDashboardCounts(reviewed.records).eligible, 4);
  const suspended = reduceDemoSession(
    reviewed,
    {
      type: "suspend",
      id: "member-example-approved",
      suspended: true,
      reason: "Sample suspended",
    },
    seed,
  );
  assert.equal(demoDashboardCounts(suspended.records).eligible, 3);
  assert.equal(demoDashboardCounts(suspended.records).suspended, 1);
  const verified = reduceDemoSession(
    suspended,
    {
      type: "credential",
      id: initial.records[0].id,
      credentialId: initial.records[0].credentials[0].id,
      verification: "verified",
    },
    seed,
  );
  assert.equal(demoDashboardCounts(verified.records).unverified, 3);
});
