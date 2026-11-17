import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
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
const preference = await client.rpc("rhh_member_consultation_preference", {
  payload: { action: "get" },
});
assert.ok(preference.error);
checks++;
const privatePreference = await fetch(
  "http://127.0.0.1:3230/api/member/consultation-preference",
);
assert.equal(privatePreference.status, 401);
checks++;
const native = await fetch("http://127.0.0.1:3230/api/consultations", {
  method: "POST",
  headers: {
    origin: "http://127.0.0.1:3230",
    "content-type": "application/x-www-form-urlencoded",
  },
  body: "name=Synthetic&email=synthetic%40example.invalid&topic=No+native+save",
});
assert.equal(native.status, 415);
checks++;
for (const admin_view of [true, false]) {
  const { error } = await client.rpc("rhh_consultation_workspace", {
    admin_view,
    action: "list",
    payload: {},
  });
  assert.ok(error);
  checks++;
}
const { error } = await client.rpc("rhh_consultation_public", {
  action: "status",
  payload: {
    requestId: "00000000-0000-4000-8000-000000000001",
    token: "0".repeat(64),
  },
});
assert.equal(error?.code, "PT404");
checks++;
for (const path of [
  "/api/admin/consultations",
  "/api/member/consultations",
  "/api/consultations",
]) {
  const r = await fetch("http://127.0.0.1:3230" + path);
  assert.equal(r.status, path === "/api/consultations" ? 404 : 401);
  assert.match(
    r.headers.get("cdn-cache-control") ?? r.headers.get("cache-control") ?? "",
    /no-store/,
  );
  checks++;
}
const forbidden = await fetch("http://127.0.0.1:3230/api/consultations", {
  method: "POST",
  headers: {
    origin: "https://untrusted.example",
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert.equal(forbidden.status, 403);
checks++;
console.log(
  `${checks} real anonymous consultation denial checks passed; no records written.`,
);
