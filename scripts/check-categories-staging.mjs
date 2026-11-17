import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
assert.equal(process.env.RHH_APP_MODE, "staging");
assert.equal(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "https://xjecnuebalmmblowmtks.supabase.co",
);
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
let checks = 0;
for (const payload of [
  { action: "get" },
  {
    action: "rename",
    id: "forged-test-no-record",
    name: "Forbidden test",
    reason: "Unauthorized request",
    version: 1,
  },
  {
    action: "rename",
    id: "forged-test-no-record",
    name: "Forbidden test",
    reason: "Unauthorized request",
    version: 1,
    monthlyUsd: 1,
  },
]) {
  assert((await client.rpc("rhh_admin_categories", { payload })).error);
  checks++;
}
const pub = await client.rpc("rhh_public_categories");
assert.equal(pub.error, null);
assert(Array.isArray(pub.data));
assert.equal(pub.data.length, 8);
assert.doesNotMatch(
  JSON.stringify(pub.data),
  /billingKey|billing_key|actorId|reason|category_changes/,
);
checks++;
const directory = await client.rpc("rhh_public_directory");
assert.equal(directory.error, null);
for (const c of pub.data)
  assert.equal(directory.data.catalog.find((x) => x.id === c.id)?.name, c.name);
checks++;
for (const path of ["/pricing", "/directory", "/consultations"]) {
  const r = await fetch("http://127.0.0.1:3230" + path);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert(
    html.includes(pub.data[0].name),
    "Saved public category label should be rendered",
  );
  assert.doesNotMatch(
    html,
    /sb_secret_|SUPABASE_SECRET_KEY|category_changes|gateway_hash/,
  );
  checks++;
}
const admin = await fetch("http://127.0.0.1:3230/api/admin/categories");
assert.equal(admin.status, 401);
assert.match(admin.headers.get("cache-control"), /private.*no-store/);
checks++;
const foreign = await fetch("http://127.0.0.1:3230/api/admin/categories", {
  method: "PATCH",
  headers: {
    origin: "https://untrusted.invalid",
    "content-type": "application/json",
  },
  body: "{}",
});
assert.equal(foreign.status, 403);
checks++;
console.log(
  `PASS: ${checks} real anonymous hosted/local category checks; no category creation or rename attempted against an existing record, no authenticated acceptance claimed.`,
);
