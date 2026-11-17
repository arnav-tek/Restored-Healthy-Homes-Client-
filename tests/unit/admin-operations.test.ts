import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import type { AuthDatabase } from "../../src/data/supabase/database.types";
import { adminOperations } from "../../src/data/supabase/admin-operations";
import {
  parseOperationsInput,
  operationsQuery,
  projectFeatured,
  projectOperationsReport,
} from "../../src/validation/admin-operations";
import { GET, POST } from "../../src/app/api/admin/featured/route";
import { GET as reportsGET } from "../../src/app/api/admin/reports/route";
import { loadConnectedHome } from "../../src/data/supabase/public-home";
import { connectedDirectory } from "../../src/data/supabase/public-directory";
const id = "00000000-0000-4000-8000-000000000001";
const item = {
  id,
  businessName: "Synthetic listing",
  approval: "approved" as const,
  membership: "active" as const,
  suspended: false,
  entitlement: "none" as const,
  selected: true,
  version: 1,
  eligible: true,
  visible: true,
};
const featured = {
  kind: "featured" as const,
  page: 1,
  view: "selected" as const,
  total: 1,
  items: [item],
  history: [],
};
const report = {
  kind: "report" as const,
  asOf: "2026-11-16T00:00:00Z",
  month: "2026-11",
  page: 1,
  total: 1,
  eligible: 1,
  undated: 0,
  applicationStatuses: { pending: 0, approved: 1, rejected: 0 },
  membershipStates: {
    active: 1,
    inactive: 0,
    past_due: 0,
    canceled: 0,
    trialing: 0,
    unpaid: 0,
    missing: 0,
  },
  featured: {
    selected: 1,
    visibleEditorial: 1,
    entitled: 0,
    visibleEntitled: 0,
    visible: 1,
  },
  categories: [
    {
      id: "mold-inspection",
      name: "Synthetic category",
      active: true,
      total: 1,
      activeMemberships: 1,
      eligible: 1,
    },
  ],
  months: [{ month: "2026-11", count: 1 }],
  items: [
    {
      id,
      businessName: item.businessName,
      approval: item.approval,
      membership: item.membership,
      suspended: false,
      submittedAt: "2026-11-01T00:00:00Z",
    },
  ],
};
const change = {
  action: "set_featured" as const,
  page: 1,
  view: "selected" as const,
  id,
  selected: false,
  version: 1,
  reason: "Approved editorial removal",
};
test("featured mutations reject authority, billing, ordering and non-boolean/stale-version input", () => {
  assert.deepEqual(parseOperationsInput(change), change);
  for (const extra of [
    { role: "admin" },
    { actorId: id },
    { approval: "approved" },
    { membership: "active" },
    { featured_entitlement: "active" },
    { order: 1 },
    { selected: "false" },
    { version: -1 },
    { version: "1" },
    { reason: "" },
    { reason: "x".repeat(301) },
    { id: "guess" },
    { page: 0 },
  ])
    assert.equal(parseOperationsInput({ ...change, ...extra }), null);
  assert.deepEqual(
    operationsQuery(new URLSearchParams({ view: "eligible", page: "2" })),
    { action: "get_featured", view: "eligible", page: 2 },
  );
  for (const q of [
    "view=all",
    "view=eligible&view=selected",
    "page=0",
    "role=admin",
  ])
    assert.equal(operationsQuery(new URLSearchParams(q)), null);
  assert.equal(
    operationsQuery(new URLSearchParams({ month: "2026-13" }), true),
    null,
  );
  assert.equal(
    operationsQuery(new URLSearchParams({ month: "0001-01" }), true)?.action,
    "report",
  );
});
test("operations projections are bounded and exclude private records/fields", () => {
  assert.deepEqual(
    projectFeatured({
      ...featured,
      ownerEmail: "PRIVATE",
      items: [
        { ...item, internalNotes: "PRIVATE", stripe_customer_id: "PRIVATE" },
      ],
    }),
    featured,
  );
  assert.deepEqual(
    projectOperationsReport({
      ...report,
      privateRecords: "PRIVATE",
      applicationStatuses: { ...report.applicationStatuses, secret: 1 },
      items: [{ ...report.items[0], contactEmail: "PRIVATE" }],
    }),
    report,
  );
  assert.equal(
    projectFeatured({ ...featured, items: Array(21).fill(item) }),
    null,
  );
  assert.equal(
    projectFeatured({ ...featured, items: [{ ...item, selected: "true" }] }),
    null,
  );
  assert.equal(
    projectOperationsReport({
      ...report,
      months: [{ month: "2026-00", count: 2 }],
    }),
    null,
  );
  assert.equal(projectOperationsReport({ ...report, eligible: -1 }), null);
});
test("adapter validates saves, unchanged booleans and sanitized role/eligibility failures", async (t) => {
  const client = createClient<AuthDatabase>(
    "https://xjecnuebalmmblowmtks.supabase.co",
    "sb_publishable_test",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  let flag: unknown = true,
    fail = "";
  t.mock.method(globalThis, "fetch", async () =>
    fail
      ? Response.json(
          {
            code: fail === "role" ? "42501" : "PT409",
            message:
              fail === "role" ? "PRIVATE DB DETAIL" : "listing_not_eligible",
          },
          { status: 403 },
        )
      : Response.json({
          ...featured,
          saved: true,
          unchanged: flag,
          secret: "PRIVATE",
        }),
  );
  assert.deepEqual(await adminOperations(client, change), {
    ...featured,
    saved: true,
    unchanged: true,
  });
  flag = "true";
  assert.deepEqual(await adminOperations(client, change), {
    ...featured,
    saved: true,
  });
  fail = "role";
  await assert.rejects(() => adminOperations(client, change), {
    status: 403,
    message: "Current administrator access is required.",
  });
  fail = "eligibility";
  await assert.rejects(() => adminOperations(client, change), {
    status: 409,
    message:
      "This listing is no longer eligible. Reload and compare; your draft is retained.",
  });
});
function env(t: { after: (f: () => void) => void }) {
  const old = { ...process.env };
  t.after(() => {
    process.env = old;
  });
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_ORIGIN: "http://127.0.0.1:3230",
    RHH_AUTH_COOKIE_SECRET: "synthetic-cookie-secret-at-least-32-characters",
  });
  delete process.env.VERCEL_ENV;
}
test("private APIs deny guests/foreign origins and never enable demo actions", async (t) => {
  env(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw Error("Unexpected network");
  });
  for (const handler of [GET, reportsGET]) {
    const r = await handler(
      new NextRequest("http://127.0.0.1:3230/api/admin/featured"),
    );
    assert.equal(r.status, 401);
    assert.match(r.headers.get("cache-control") ?? "", /private.*no-store/);
  }
  assert.equal(
    (
      await POST(
        new NextRequest("http://127.0.0.1:3230/api/admin/featured", {
          method: "POST",
          headers: { origin: "https://evil.invalid" },
        }),
      )
    ).status,
    403,
  );
  assert.equal(calls, 0);
  process.env.RHH_APP_MODE = "demo";
  assert.equal(
    (await GET(new NextRequest("http://127.0.0.1:3230/api/admin/featured")))
      .status,
    404,
  );
});
test("public readers retain distinct editorial/entitlement flags and fail without fictional fallback", async (t) => {
  env(t);
  const profile = {
    id,
    businessName: item.businessName,
    publicDisplayName: "",
    city: "Fixture city",
    state: "CA",
    specialty: "",
    summary: "Synthetic profile for public projection testing.",
    serviceArea: "",
    freeConsultation: false,
    featured: false,
    editorialFeatured: true,
    contact: { email: "", phone: "", website: "" },
    categoryIds: [],
    services: [],
    verifiedCredentials: [],
    listedCredentials: [],
    internalNotes: "PRIVATE",
  };
  let unavailable = false;
  t.mock.method(globalThis, "fetch", async () =>
    unavailable
      ? Response.json({ error: "PRIVATE diagnostic" }, { status: 503 })
      : Response.json({
          catalog: [],
          profiles: [profile],
          reviews: [],
          history: "PRIVATE",
        }),
  );
  const home = await loadConnectedHome();
  assert.equal(home.featured.length, 1);
  assert.equal(home.featured[0].featured, false);
  assert.equal(home.featured[0].editorialFeatured, true);
  assert.doesNotMatch(JSON.stringify(home), /PRIVATE/);
  assert.equal((await connectedDirectory.listFeaturedPublic()).length, 1);
  unavailable = true;
  assert.equal((await loadConnectedHome()).featured.length, 0);
  assert.equal((await loadConnectedHome()).unavailable, true);
});
