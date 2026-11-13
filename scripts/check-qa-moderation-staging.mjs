import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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
const id = randomUUID(),
  decision = {
    kind: "question",
    id,
    version: 1,
    parentVersion: null,
    action: "publish",
    reason: "Unauthorized test request",
    note: "",
  };
let checks = 0;
for (const [name, args] of [
  ["rhh_admin_qa", { filters: {} }],
  ["rhh_moderate_qa", { payload: decision }],
]) {
  const result = await client.rpc(name, args);
  assert.ok(result.error);
  assert.equal(result.data, null);
  checks++;
}
const guessed = await client.rpc("rhh_public_qa", { target: id });
assert.equal(guessed.error, null);
assert.deepEqual(guessed.data.questions, []);
checks++;
console.log(
  `PASS: ${checks} real anonymous hosted Q&A moderation/public RPC checks; no records created.`,
);
for (const [method, path, origin, status] of [
  ["GET", "/api/admin/questions", "", 401],
  ["POST", "/api/admin/questions", "http://127.0.0.1:3230", 401],
  ["POST", "/api/admin/questions", "https://evil.invalid", 403],
]) {
  const r = await fetch("http://127.0.0.1:3230" + path, {
    method,
    headers: { origin, "content-type": "application/json" },
    ...(method === "POST" ? { body: JSON.stringify(decision) } : {}),
  });
  assert.equal(r.status, status);
  assert.match(r.headers.get("cache-control"), /private/);
  assert.match(r.headers.get("cache-control"), /no-store/);
  assert.doesNotMatch(
    await r.text(),
    /recipientEmail|bodySnapshot|actorId|moderation_note|sb_secret_/,
  );
}
const protectedPage = await fetch("http://127.0.0.1:3230/admin/questions", {
  redirect: "manual",
});
assert.ok([303, 307].includes(protectedPage.status));
assert.ok(protectedPage.headers.get("location").includes("/login"));
console.log(
  "PASS: four real anonymous local website moderation authorization/origin/cache/page checks. Positive admin/member JWT flows remain unverified.",
);
