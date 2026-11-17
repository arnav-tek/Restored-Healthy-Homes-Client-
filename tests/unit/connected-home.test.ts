import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { loadConnectedHome } from "../../src/data/supabase/public-home";
import { accountReturnPath } from "../../src/validation/auth";
import { proxy } from "../../src/proxy";
import { connectedDirectory } from "../../src/data/supabase/public-directory";
import { defaultSearch } from "../../src/domain/directory-search";
const env = {
  RHH_APP_MODE: "staging",
  NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};
test("connected homepage uses only projected public data, and distinguishes zero from failure", async (t) => {
  const old = { ...process.env };
  Object.assign(process.env, env);
  delete process.env.VERCEL_ENV;
  t.after(() => {
    process.env = old;
  });
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      catalog: [
        {
          id: "mold-inspection",
          name: "Testing",
          monthlyUsd: 79,
          active: true,
          internalNotes: "PRIVATE",
        },
        { id: "inactive", name: "Inactive", monthlyUsd: 79, active: false },
      ],
      reviews: [],
      profiles: [],
      privateRecords: "PRIVATE",
    }),
  );
  const data = await loadConnectedHome();
  assert.equal(data.unavailable, false);
  assert.equal(data.profiles.length, 0);
  assert.equal(data.catalog.length, 1);
  assert.equal(JSON.stringify(data).includes("PRIVATE"), false);
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: "private diagnostics" }, { status: 503 }),
  );
  assert.deepEqual(await loadConnectedHome(), {
    catalog: [],
    profiles: [],
    featured: [],
    reviews: [],
    unavailable: true,
  });
  const search = await connectedDirectory.search({
    ...defaultSearch,
    location: "Unconnected city",
  });
  assert.equal(search.ok, false);
});
test("public homepage and connected content routes are allowed; unknown routes remain readable", async (t) => {
  const old = { ...process.env };
  Object.assign(process.env, env);
  delete process.env.VERCEL_ENV;
  t.after(() => {
    process.env = old;
  });
  const home = await proxy(new NextRequest("http://localhost/"));
  assert.equal(home.headers.get("location"), null);
  assert.equal(home.headers.get("x-middleware-next"), "1");
  assert.match(home.headers.get("cache-control")!, /no-store/);
  for (const path of [
    "/education",
    "/about",
    "/resources",
    "/resources/approved-slug",
    "/contact",
    "/terms",
    "/privacy",
    "/disclaimer",
    "/pricing",
  ]) {
    const ready = await proxy(new NextRequest("http://localhost" + path));
    assert.equal(ready.status, 200);
    assert.equal(ready.headers.get("x-middleware-rewrite"), null);
    assert.equal(ready.headers.get("x-middleware-next"), "1");
  }
  const missing = await proxy(
    new NextRequest("http://localhost/not-a-real-page"),
  );
  assert.equal(missing.status, 404);
});
test("role-aware returns stay local, preserve member destinations, and never route members into admin", () => {
  for (const value of [
    undefined,
    "https://evil.invalid",
    "//evil.invalid",
    "/%2f%2fevil.invalid",
    "/member?next=bad",
  ]) {
    assert.equal(accountReturnPath("member", value), "/member");
    assert.equal(accountReturnPath("admin", value), "/admin");
  }
  assert.equal(accountReturnPath("member", "/admin"), "/member");
  assert.equal(
    accountReturnPath("member", "/member/profile"),
    "/member/profile",
  );
  assert.equal(
    accountReturnPath("member", "/member/membership"),
    "/member/membership",
  );
  assert.equal(accountReturnPath("admin", "/"), "/");
});

test("new dashboard sections survive sign-in without crossing account roles", () => {
  for (const path of [
    "/admin/featured",
    "/admin/reports",
    "/admin/content",
    "/admin/categories",
    "/admin/credentials",
    "/admin/notifications",
    "/admin/questions",
    "/admin/reviews",
    "/admin/consultations",
    "/admin/applications",
    "/admin/listings",
  ]) {
    assert.equal(accountReturnPath("admin", path), path);
    assert.equal(accountReturnPath("member", path), "/member");
  }
  for (const path of [
    "/member/consultations",
    "/member/inquiries/00000000-0000-4000-8000-000000000001",
  ]) {
    assert.equal(accountReturnPath("member", path), path);
    assert.equal(accountReturnPath("admin", path), "/admin");
  }
  const detail = "/admin/applications/00000000-0000-4000-8000-000000000001";
  assert.equal(accountReturnPath("admin", detail), detail);
  assert.equal(accountReturnPath("member", detail), "/member");
  for (const path of [
    "/admin/unknown",
    "/admin/reports?next=//evil.invalid",
    "/admin/../member",
    "/admin/listings/not-a-uuid",
    "/member/inquiries/00000000-0000-4000-8000-000000000001/extra",
  ]) {
    assert.equal(accountReturnPath("admin", path), "/admin");
    assert.equal(accountReturnPath("member", path), "/member");
  }
});
