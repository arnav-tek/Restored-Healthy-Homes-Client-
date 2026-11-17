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
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
let checks = 0;
const publicResult = await client.rpc("rhh_directory_search", { filters: {} });
assert.equal(
  publicResult.error,
  null,
  "Public RPC should be usable anonymously",
);
assert(Array.isArray(publicResult.data.profiles));
assert(publicResult.data.profiles.length <= 6);
checks++;
assert.doesNotMatch(
  JSON.stringify(publicResult.data),
  /owner_id|ownerId|internalNotes|moderation_note|sb_secret_|objectPath/,
);
checks++;
for (const filters of [
  { sort: "nearest" },
  { radius: 9 },
  { page: 0 },
  { latitude: 90, longitude: 180 },
  { place: "00000000-0000-4000-8000-000000000001" },
]) {
  assert((await client.rpc("rhh_directory_search", { filters })).error);
  checks++;
}
assert(
  (await client.rpc("rhh_member_location", { payload: { action: "get" } }))
    .error,
);
checks++;
assert(
  (
    await client.rpc("rhh_member_location", {
      payload: { action: "save", place: null, version: 1, ownerId: "forged" },
    })
  ).error,
);
checks++;
assert(
  (
    await client.rpc("rhh_geocoding", {
      gateway: "forged",
      operation: "begin",
      payload: {},
    })
  ).error,
);
checks++;
console.log(
  `PASS: ${checks} real anonymous hosted checks, public total ${publicResult.data.total}; no provider request, location/ownership write or test identity created.`,
);
for (const path of [
  "/",
  "/directory",
  "/directory?location=00501",
  "/directory?latitude=91&longitude=181",
]) {
  const r = await fetch("http://127.0.0.1:3230" + path);
  assert.equal(r.status, 200);
  const text = await r.text();
  assert.doesNotMatch(
    text,
    /sb_secret_|GEOAPIFY_API_KEY|RHH_LOCATION_GATEWAY_KEY|rhh_private\.geocode/,
  );
}
const denied = await fetch("http://127.0.0.1:3230/api/member/location");
assert.equal(denied.status, 401);
assert.match(denied.headers.get("cache-control"), /private.*no-store/);
const missing = await fetch("http://127.0.0.1:3230/api/locations", {
  method: "POST",
  headers: {
    origin: "http://127.0.0.1:3230",
    "content-type": "application/json",
  },
  body: JSON.stringify({ query: "00501" }),
});
assert.equal(missing.status, 503);
assert.match(missing.headers.get("cache-control"), /private.*no-store/);
assert.match(await missing.text(), /not available yet/);
const worker = await fetch("http://127.0.0.1:3230/api/map-worker");
assert.equal(worker.status, 200);
assert.match(worker.headers.get("content-type"), /javascript/);
console.log(
  "PASS: seven anonymous local website/private-cache/worker checks. No live geocoding, populated map or authenticated persistence acceptance claimed.",
);
