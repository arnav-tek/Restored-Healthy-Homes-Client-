import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
assert.equal(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "https://xjecnuebalmmblowmtks.supabase.co",
);
assert.equal(process.env.RHH_APP_MODE, "staging");
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
const member = await client.rpc("rhh_member_media", {
  action: "get",
  target: null,
  expected_version: null,
  publish: false,
});
assert.ok(member.error);
checks++;
const id = randomUUID(),
  path = `${randomUUID()}/${id}.webp`;
const route = await client.rpc("rhh_public_profile_media", {
  target_id: randomUUID(),
  media_id: id,
});
assert.equal(route.error, null);
assert.equal(route.data, null);
checks++;
const bucket = client.storage.from("rhh-profile-images");
const uploaded = await bucket.upload(path, Buffer.from("not an image"), {
  contentType: "image/webp",
  upsert: false,
});
assert.ok(uploaded.error, "Anonymous raw uploads must fail");
checks++;
const downloaded = await bucket.download(path);
assert.ok(downloaded.error);
checks++;
const signed = await bucket.createSignedUrl(path, 60);
assert.ok(signed.error);
checks++;
const deleted = await bucket.remove([path]);
assert.ok(
  deleted.error || (Array.isArray(deleted.data) && deleted.data.length === 0),
);
checks++;
console.log(
  `PASS: ${checks} real anonymous staging media checks; no object created, no successful signing or private byte transfer claimed.`,
);
console.log({
  serverStorageCredentialPresent: !!process.env.SUPABASE_SECRET_KEY,
  memberATestLoginConfigured: !!(
    process.env.RHH_TEST_MEMBER_A_EMAIL &&
    process.env.RHH_TEST_MEMBER_A_PASSWORD
  ),
  memberBTestLoginConfigured: !!(
    process.env.RHH_TEST_MEMBER_B_EMAIL &&
    process.env.RHH_TEST_MEMBER_B_PASSWORD
  ),
});
