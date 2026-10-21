import { test } from "node:test";
import assert from "node:assert/strict";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import {
  createDemoSession,
  reduceDemoSession,
  memberFormFields,
  demoPublicDirectory,
  type DemoMemberAction,
} from "../../src/domain/demo-member";
import {
  adminAnalytics,
  featuredDemoRecords,
  membershipStatuses,
} from "../../src/domain/admin-showcase";
import { parseAdminArticle } from "../../src/validation/admin-showcase";
import {
  parseDashboardQuery,
  dashboardHref,
} from "../../src/validation/dashboard";

function session(admin = true) {
  const seed = getDemoSessionSeed();
  let state = createDemoSession(seed);
  if (admin)
    state = reduceDemoSession(
      state,
      {
        type: "demo-sign-in",
        fields: { email: "admin@example.invalid", passcode: "home-access" },
      },
      seed,
    );
  return {
    get state() {
      return state;
    },
    act(action: DemoMemberAction) {
      state = reduceDemoSession(state, action, seed);
      return state;
    },
  };
}

test("membership simulations preserve independent approval/suspension and featured eligibility across all states", () => {
  const demo = session();
  const id = "member-example-pending";
  demo.act({
    type: "set-featured",
    id,
    enabled: true,
    reason: "Upgrade scenario",
  });
  demo.act({
    type: "simulate-membership",
    id,
    status: "active",
    reason: "Payment scenario",
  });
  assert.ok(
    !demoPublicDirectory(demo.state.records).some((item) => item.id === id),
  );
  demo.act({
    type: "decide",
    id,
    approval: "approved",
    reason: "Approved sample",
  });
  assert.ok(
    featuredDemoRecords(demo.state.records).some((item) => item.id === id),
  );
  demo.act({
    type: "suspend",
    id,
    suspended: true,
    reason: "Suspension scenario",
  });
  for (const status of membershipStatuses) {
    demo.act({
      type: "simulate-membership",
      id,
      status,
      reason: "Lifecycle scenario",
    });
    const record = demo.state.records.find((item) => item.id === id)!;
    assert.equal(record.suspended, true);
    assert.equal(record.featuredEntitlement, "active");
    assert.ok(
      !featuredDemoRecords(demo.state.records).some((item) => item.id === id),
    );
  }
  demo.act({
    type: "suspend",
    id,
    suspended: false,
    reason: "Reinstate sample",
  });
  for (const status of membershipStatuses) {
    demo.act({
      type: "simulate-membership",
      id,
      status,
      reason: "Lifecycle scenario",
    });
    assert.equal(
      featuredDemoRecords(demo.state.records).some((item) => item.id === id),
      status === "active",
    );
  }
});

test("admin showcase commands reject anonymous/member use, missing targets, invalid states and invalid notes", () => {
  for (const account of [null, "approved"]) {
    const demo = session(false);
    if (account)
      demo.act({
        type: "demo-sign-in",
        fields: {
          email: `${account}@example.invalid`,
          passcode: "home-access",
        },
      });
    const before = demo.state;
    demo.act({
      type: "simulate-membership",
      id: "member-example-approved",
      status: "canceled",
      reason: "Attempt change",
    });
    demo.act({
      type: "set-featured",
      id: "member-example-approved",
      enabled: true,
      reason: "Attempt change",
    });
    demo.act({
      type: "publish-article",
      id: demo.state.articles[0].id,
      published: true,
    });
    demo.act({ type: "save-article", id: "", fields: demo.state.articles[0] });
    assert.equal(demo.state, before);
  }
  const demo = session();
  const before = demo.state;
  demo.act({
    type: "simulate-membership",
    id: "missing",
    status: "active",
    reason: "Missing target",
  });
  demo.act({
    type: "set-featured",
    id: demo.state.records[0].id,
    enabled: true,
    reason: "x",
  });
  demo.act({
    type: "simulate-membership",
    id: demo.state.records[0].id,
    status: "forged" as "active",
    reason: "Invalid state",
  });
  assert.equal(demo.state, before);
});

test("admin profile edits validate, preserve protected fields and revoke changed credential decisions", () => {
  const demo = session();
  const record = demo.state.records[0];
  demo.act({
    type: "credential",
    id: record.id,
    credentialId: record.credentials[0].id,
    verification: "verified",
  });
  const before = demo.state;
  demo.act({
    type: "edit",
    id: record.id,
    profile: { ...memberFormFields(record), website: "javascript:alert(1)" },
  });
  assert.equal(demo.state, before);
  demo.act({
    type: "edit",
    id: record.id,
    profile: {
      ...memberFormFields(record),
      businessName: "Updated Fictional Studio",
      listedCredentials: ["New unverified claim"],
      ...{ approval: "rejected", subscription: "unpaid", suspended: true },
    },
  });
  const updated = demo.state.records[0];
  assert.equal(updated.profile.businessName, "Updated Fictional Studio");
  assert.equal(updated.approval, record.approval);
  assert.equal(updated.subscription, record.subscription);
  assert.equal(updated.suspended, false);
  assert.equal(updated.credentials[0].verification, "unverified");
  assert.ok(!("approval" in updated.profile));
});

test("resource publishing requires a saved valid draft; edited publications return to draft and reset clears them", () => {
  const demo = session();
  const fields = {
    title: "Sample owner article",
    category: "planning" as const,
    summary: "A fictional summary for reviewing the content workflow.",
    body: "A plain-text resource body that demonstrates the editorial workflow without creating public content.",
  };
  demo.act({ type: "save-article", id: "", fields });
  const article = demo.state.articles.at(-1)!;
  assert.equal(article.status, "draft");
  demo.act({ type: "publish-article", id: article.id, published: true });
  assert.equal(demo.state.articles.at(-1)!.status, "published");
  demo.act({
    type: "save-article",
    id: article.id,
    fields: { ...fields, title: "Edited sample resource" },
  });
  assert.equal(demo.state.articles.at(-1)!.id, article.id);
  assert.equal(demo.state.articles.at(-1)!.status, "draft");
  const before = demo.state;
  demo.act({ type: "save-article", id: "missing", fields });
  demo.act({ type: "publish-article", id: "missing", published: true });
  assert.equal(demo.state, before);
  assert.ok(demo.state.adminActivity.length >= 3);
  demo.act({ type: "demo-sign-out" });
  assert.equal(demo.state.articles.length, 2);
  demo.act({ type: "reset" });
  assert.equal(demo.state.articles.length, 1);
  assert.equal(demo.state.articles[0].status, "draft");
  assert.equal(demo.state.adminActivity.length, 0);
  assert.equal(session().state.articles.length, 1);
  assert.equal(parseAdminArticle({ ...fields, title: "x" }), null);
  assert.equal(parseAdminArticle({ ...fields, category: "unknown" }), null);
  assert.equal(parseAdminArticle({ ...fields, body: "x".repeat(10001) }), null);
  assert.deepEqual(
    parseAdminArticle({ ...fields, status: "published", id: "forged" }),
    fields,
  );
});

test("analytics separate active and eligible, count shared category records and respect monthly dates", () => {
  const demo = session();
  const base = adminAnalytics(demo.state.records, "2026-10");
  assert.equal(base.newApplications, demo.state.records.length);
  assert.equal(
    adminAnalytics(demo.state.records, "2026-09").newApplications,
    0,
  );
  const record = demo.state.records[0];
  demo.act({
    type: "suspend",
    id: record.id,
    suspended: true,
    reason: "Analytics scenario",
  });
  const suspended = adminAnalytics(demo.state.records, "2026-10");
  assert.equal(suspended.active, base.active);
  assert.equal(suspended.eligible, base.eligible - 1);
  demo.act({
    type: "submit",
    profile: {
      ...memberFormFields(record),
      categoryIds: ["healthy-designers", "healthy-builders"],
    },
    submittedOn: "2026-11-01",
  });
  const result = adminAnalytics(demo.state.records, "2026-11");
  assert.equal(result.newApplications, 1);
  assert.equal(
    result.byCategory("healthy-builders").total,
    base.byCategory("healthy-builders").total + 1,
  );
  assert.equal(
    result.byCategory("healthy-designers").total,
    base.byCategory("healthy-designers").total + 1,
  );
  assert.equal(
    result.membership.reduce((sum, item) => sum + item.count, 0),
    result.total,
  );
});

test("new admin sections round-trip canonical internal URLs and remain unavailable in member section parsing", () => {
  for (const section of ["membership", "featured", "content", "analytics"]) {
    const query = parseDashboardQuery(
      "admin",
      new URLSearchParams({ section, record: "new" }),
    );
    assert.equal(query.section, section);
    assert.ok(dashboardHref("admin", query).includes(`section=${section}`));
    if (section !== "membership")
      assert.equal(
        parseDashboardQuery("member", new URLSearchParams({ section })).section,
        "overview",
      );
  }
});
