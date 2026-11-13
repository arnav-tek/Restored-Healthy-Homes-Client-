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
let checks = 0;
for (const [name, args] of [
  ["rhh_member_credentials", { payload: { action: "get" } }],
  ["rhh_admin_credentials", { page_number: 1 }],
  ["rhh_credential_file", { target: randomUUID(), admin_mode: false }],
  ["rhh_credential_file", { target: randomUUID(), admin_mode: true }],
  [
    "rhh_review_credential",
    {
      payload: {
        claimId: randomUUID(),
        evidenceId: null,
        version: 1,
        action: "verify",
        reason: "Unauthorized test review",
      },
    },
  ],
]) {
  const result = await client.rpc(name, args);
  assert.ok(result.error, "Anonymous credential RPC must fail");
  assert.equal(result.data, null);
  checks++;
}
const bucket = client.storage.from("rhh-credential-evidence");
const path = `${randomUUID()}/${randomUUID()}/${randomUUID()}.webp`;
assert.ok(
  (
    await bucket.upload(path, Buffer.from("negative authorization test"), {
      contentType: "image/webp",
      upsert: false,
    })
  ).error,
);
checks++;
assert.ok((await bucket.download(path)).error);
checks++;
assert.ok((await bucket.createSignedUrl(path, 60)).error);
checks++;
const deleted = await bucket.remove([path]);
assert.ok(
  deleted.error || (Array.isArray(deleted.data) && deleted.data.length === 0),
);
checks++;
console.log(
  `PASS: ${checks} real anonymous staging RPC/Storage checks. No object created; no populated-file isolation or successful byte transfer claimed.`,
);
for (const endpoint of [
  "/api/member/credentials",
  "/api/admin/credentials",
  `/api/member/credentials?file=${randomUUID()}`,
  `/api/admin/credentials?file=${randomUUID()}`,
]) {
  const r = await fetch("http://127.0.0.1:3230" + endpoint, {
    redirect: "manual",
  });
  assert.equal(r.status, 401);
  assert.match(r.headers.get("cache-control"), /private/);
  assert.match(r.headers.get("cache-control"), /no-store/);
  const body = await r.text();
  assert.doesNotMatch(
    body,
    /objectPath|actorId|reviewedAt|sb_secret_|service_role/,
  );
}
console.log(
  "PASS: four real anonymous local website credential/file authorization and private-cache checks.",
);
