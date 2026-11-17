import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "../../src/data/supabase/database.types";
import {
  parseCategoryMutation,
  parseAdminCategories,
} from "../../src/validation/admin-categories";
import { adminCategories } from "../../src/data/supabase/admin-categories";
import { GET, POST } from "../../src/app/api/admin/categories/route";
import { accountReturnPath } from "../../src/validation/auth";
const id = "00000000-0000-4000-8000-000000000001";
const item = {
  id: "mold-inspection",
  name: "Mold Testing / Inspectors",
  description: "",
  monthlyUsd: 79,
  billingKey: "membership-inspection",
  active: true,
};
const snapshot = { version: 1, items: [item], history: [] };
const mutation = {
  action: "rename" as const,
  id: item.id,
  name: "Inspection category revised",
  reason: "Approved isolated test change",
  version: 1,
};
test("category fields are explicit, bounded and immutable outside creation", () => {
  assert.equal(accountReturnPath("member", "/admin/categories"), "/member");
  assert.deepEqual(parseCategoryMutation(mutation), mutation);
  for (const extra of [
    { ownerId: id },
    { role: "admin" },
    { actorId: id },
    { monthlyUsd: 1 },
    { billingKey: "changed" },
    { active: false },
    { approval: "approved" },
    { version: 0 },
    { version: "1" },
    { name: " " },
    { name: "x".repeat(81) },
    { name: "<script>" },
    { name: "Test\u200bcategory" },
  ])
    assert.equal(parseCategoryMutation({ ...mutation, ...extra }), null);
  const created = {
    ...mutation,
    action: "create",
    id: "test-specialty",
    description: "Explicit test-only category description.",
    monthlyUsd: 123,
    billingKey: "membership-test-specialty",
  };
  assert.deepEqual(parseCategoryMutation(created), created);
  for (const extra of [
    { monthlyUsd: 0 },
    { monthlyUsd: 1.1 },
    { monthlyUsd: 10001 },
    { billingKey: "" },
    { id: "Bad ID" },
    { description: "short" },
  ])
    assert.equal(parseCategoryMutation({ ...created, ...extra }), null);
});
test("category admin projection excludes unexpected private fields and validates histories", () => {
  assert.deepEqual(
    parseAdminCategories({
      ...snapshot,
      secret: "PRIVATE",
      items: [{ ...item, ownerId: "PRIVATE" }],
    }),
    snapshot,
  );
  const h = {
    id,
    categoryId: item.id,
    actorId: id,
    action: "rename",
    reason: "Test history only",
    previousName: item.name,
    name: mutation.name,
    version: 2,
    at: "2026-11-16T00:00:00Z",
  };
  assert.deepEqual(
    parseAdminCategories({
      ...snapshot,
      version: 2,
      history: [{ ...h, privateContact: "PRIVATE" }],
    }),
    { ...snapshot, version: 2, history: [h] },
  );
  assert.equal(parseAdminCategories({ ...snapshot, version: 0 }), null);
});
test("category adapter uses caller authorization, allowlists saved flags and preserves normal responses", async (t) => {
  const client = createClient<AuthDatabase>(
    "https://xjecnuebalmmblowmtks.supabase.co",
    "sb_publishable_test",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  let denied = false,
    flag: unknown = true;
  t.mock.method(globalThis, "fetch", async () =>
    denied
      ? Response.json(
          { code: "42501", message: "PRIVATE DB detail" },
          { status: 403 },
        )
      : Response.json({
          ...snapshot,
          saved: true,
          unchanged: flag,
          secret: "PRIVATE",
          items: [{ ...item, ownerId: "PRIVATE" }],
        }),
  );
  assert.deepEqual(await adminCategories(client, mutation), {
    ...snapshot,
    saved: true,
    unchanged: true,
  });
  flag = "true";
  assert.deepEqual(await adminCategories(client, mutation), {
    ...snapshot,
    saved: true,
  });
  assert.deepEqual(await adminCategories(client), snapshot);
  denied = true;
  await assert.rejects(() => adminCategories(client, mutation), {
    status: 403,
    message: "Current administrator access is required.",
  });
});
test("category HTTP boundary denies guests/cross-site mutations before DB access and never uses demo roles", async (t) => {
  const old = { ...process.env };
  t.after(() => {
    process.env = old;
  });
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_ORIGIN: "http://127.0.0.1:3230",
    RHH_AUTH_COOKIE_SECRET: "test-cookie-secret-at-least-32-characters",
  });
  delete process.env.VERCEL_ENV;
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw Error("Unexpected network");
  });
  const guest = await GET(
    new NextRequest("http://127.0.0.1:3230/api/admin/categories"),
  );
  assert.equal(guest.status, 401);
  assert.match(guest.headers.get("cache-control")!, /private.*no-store/);
  const foreign = await POST(
    new NextRequest("http://127.0.0.1:3230/api/admin/categories", {
      method: "POST",
      headers: {
        origin: "https://untrusted.invalid",
        "content-type": "application/json",
      },
      body: JSON.stringify(mutation),
    }),
  );
  assert.equal(foreign.status, 403);
  assert.equal(calls, 0);
  process.env.RHH_APP_MODE = "demo";
  assert.equal(
    (await GET(new NextRequest("http://127.0.0.1:3230/api/admin/categories")))
      .status,
    404,
  );
});
