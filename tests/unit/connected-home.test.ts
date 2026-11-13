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
test("public homepage is allowed and future public routes are readable rewrites", async (t) => {
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
  const pending = await proxy(new NextRequest("http://localhost/education"));
  assert.match(pending.headers.get("x-middleware-rewrite")!, /availability/);
  assert.equal(pending.status, 200);
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
