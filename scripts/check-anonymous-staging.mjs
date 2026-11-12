// Read-only boundary checks: anonymous/forged requests must be rejected before writes.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* Caller may supply environment. */
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.equal(url, "https://xjecnuebalmmblowmtks.supabase.co");
assert.match(key ?? "", /^sb_publishable_/);
const client = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
let checks = 0;
for (const [name, args] of [
  ["rhh_member_workspace", {}],
  ["rhh_create_application", { profile: {} }],
  ["rhh_save_profile", { profile: {}, expected_version: 1 }],
  ["rhh_admin_workspace", {}],
  [
    "rhh_admin_decide",
    {
      target_id: "00000000-0000-4000-8000-000000000000",
      expected_profile_version: 1,
      expected_decision_version: 1,
      decision: "approve",
      reason: "Anonymous denial check",
      notes: "",
    },
  ],
]) {
  const { status, error } = await client.rpc(name, args);
  assert.equal(status, 401, `${name}: anonymous denial required`);
  assert.equal(error?.code, "42501");
  checks++;
}
const { data, error, status } = await client.rpc("rhh_public_directory");
assert.equal(status, 200);
assert.equal(error, null);
for (const profile of data.profiles) {
  const allowed = [
    "id",
    "businessName",
    "publicDisplayName",
    "city",
    "state",
    "specialty",
    "summary",
    "serviceArea",
    "freeConsultation",
    "featured",
    "contact",
    "categoryIds",
    "services",
    "verifiedCredentials",
    "listedCredentials",
  ];
  assert.ok(
    Object.keys(profile).every((k) => allowed.includes(k)),
    "Unexpected public profile field",
  );
  assert.ok(
    Object.keys(profile.contact).every((k) =>
      ["email", "phone", "website"].includes(k),
    ),
    "Unexpected public contact field",
  );
}
checks++;
const raw = await fetch(`${url}/rest/v1/accounts?select=*`, {
  headers: { apikey: key, "Accept-Profile": "rhh" },
});
assert.equal(raw.status, 406, "Private schema must remain unexposed");
checks++;
const forged =
  [
    { alg: "HS256", typ: "JWT" },
    {
      sub: "00000000-0000-4000-8000-000000000001",
      role: "authenticated",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 300,
      user_metadata: { role: "admin" },
    },
  ]
    .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url"))
    .join(".") + ".invalidsignature";
const spoof = await fetch(`${url}/rest/v1/rpc/rhh_admin_workspace`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${forged}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert.equal(spoof.status, 401, "Unsigned browser identity must be denied");
checks++;
// Opt in after the inquiry migration is applied. All submissions below must fail
// before writes; no published listing, client inbox or real sender is touched.
if (process.argv.includes("--inquiries")) {
  const target = "00000000-0000-4000-8000-000000000000";
  for (const [name, args] of [
    ["rhh_inbox", { page_number: 1 }],
    ["rhh_read_inquiry", { target }],
    ["rhh_set_inquiry_read", { target, is_read: true, expected_version: 1 }],
  ]) {
    const result = await client.rpc(name, args);
    assert.equal(result.status, 401);
    assert.equal(result.error?.code, "42501");
    checks++;
  }
  const payload = {
    professionalId: target,
    requestId: crypto.randomUUID(),
    name: "Anonymous boundary test",
    email: "boundary@example.invalid",
    message: "Test-only unavailable inquiry. Must never be stored.",
  };
  const forged = await client.rpc("rhh_submit_inquiry", {
    payload: { ...payload, recipientId: target },
  });
  assert.equal(forged.status, 400);
  assert.equal(forged.error?.code, "22023");
  checks++;
  assert.equal(
    data.profiles.some((p) => p.id === target),
    false,
    "Boundary sentinel unexpectedly published",
  );
  const unavailable = await client.rpc("rhh_submit_inquiry", { payload });
  assert.equal(unavailable.status, 404);
  assert.equal(unavailable.error?.code, "PT404");
  checks++;
  const inbox = await fetch(`${url}/rest/v1/inquiries?select=*`, {
    headers: { apikey: key, "Accept-Profile": "rhh" },
  });
  assert.equal(inbox.status, 406);
  checks++;
}
if (process.argv.includes("--notifications")) {
  const target = "00000000-0000-4000-8000-000000000000";
  for (const [name, args] of [
    ["rhh_admin_inquiry_email_jobs", { page_number: 1 }],
    [
      "rhh_retry_inquiry_email",
      { target, expected_version: 1, reason: "Anonymous denial test" },
    ],
    ["rhh_claim_inquiry_email", {}],
    [
      "rhh_prepare_inquiry_email",
      {
        target,
        claim_token: target,
        provider: "recording-test",
        sender: "test@example.invalid",
        origin: "http://127.0.0.1:3230",
        mode: "test",
        idempotency_seconds: 0,
      },
    ],
    [
      "rhh_finish_inquiry_email",
      {
        target,
        claim_token: target,
        outcome: "test_recorded",
        code: "",
        receipt: null,
        retry_after_seconds: 0,
      },
    ],
  ]) {
    const result = await client.rpc(name, args);
    assert.equal(result.status, 401);
    assert.equal(result.error?.code, "42501");
    checks++;
  }
  const privateQueue = await fetch(
    `${url}/rest/v1/inquiry_email_jobs?select=*`,
    { headers: { apikey: key, "Accept-Profile": "rhh_private" } },
  );
  assert.equal(privateQueue.status, 406);
  checks++;
}
console.log(
  `PASS: ${checks} real anonymous/forged staging boundary checks; public profiles=${data.profiles.length}. No confirmed-user authorization or populated-public projection claimed.`,
);
