// Opt-in live checks with two designated, confirmed test accounts. Never uses a service key.
// Test-only applications are retained in staging; this script does not delete or reset data.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* Environment may be supplied by the caller. */
}
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "RHH_TEST_MEMBER_A_EMAIL",
  "RHH_TEST_MEMBER_A_PASSWORD",
  "RHH_TEST_MEMBER_B_EMAIL",
  "RHH_TEST_MEMBER_B_PASSWORD",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length || !process.argv.includes("--allow-test-writes")) {
  console.log(
    `BLOCKED: two confirmed test accounts and --allow-test-writes are required. Missing configuration names: ${missing.join(", ") || "none"}.`,
  );
  process.exit(2);
}
assert.equal(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "https://xjecnuebalmmblowmtks.supabase.co",
);
assert.match(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  /^sb_publishable_/,
);
const clients = ["A", "B"].map(() =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  ),
);
async function login(client, letter) {
  const { data, error } = await client.auth.signInWithPassword({
    email: process.env[`RHH_TEST_MEMBER_${letter}_EMAIL`],
    password: process.env[`RHH_TEST_MEMBER_${letter}_PASSWORD`],
  });
  assert(
    !error && data.user?.email_confirmed_at && !data.user.is_anonymous,
    "Confirmed designated test sign-in required",
  );
  return data.user.id;
}
async function call(client, name, args = {}) {
  const { data, error } = await client.rpc(name, args);
  assert(!error, `RPC ${name} failed; no private diagnostic printed`);
  return data;
}
async function denied(client, name, args) {
  const { error } = await client.rpc(name, args);
  assert(error, `${name} unexpectedly succeeded`);
}
try {
  const [idA, idB] = await Promise.all(
    clients.map((client, i) => login(client, i ? "B" : "A")),
  );
  assert.notEqual(idA, idB, "Two distinct identities are required");
  let concurrentCreation = false;
  for (const [i, client] of clients.entries()) {
    const marker = `Staging ownership test ${i ? "B" : "A"}`;
    const current = await call(client, "rhh_member_workspace");
    if (current.application) {
      assert.equal(
        current.application.profile.businessName,
        marker,
        "Refusing to edit an application that is not this designated test record",
      );
      continue;
    }
    const profile = {
      name: `Test member ${i ? "B" : "A"}`,
      businessName: marker,
      email: process.env[`RHH_TEST_MEMBER_${i ? "B" : "A"}_EMAIL`],
      phone: "",
      website: "",
      city: "Raleigh",
      state: "NC",
      description:
        "Staging-only ownership test application. Not a real business.",
      practices: "Staging-only test data; no professional claims.",
      services: ["Staging test service"],
      listedCredentials: [],
      categoryIds: ["mold-inspection"],
    };
    const results = await Promise.all([
      client.rpc("rhh_create_application", { profile }),
      client.rpc("rhh_create_application", { profile }),
    ]);
    assert.equal(
      results.filter((r) => !r.error).length,
      1,
      "Concurrent create must have exactly one winner",
    );
    assert.equal(
      results.find((r) => r.error).error.message,
      "application_exists",
    );
    concurrentCreation = true;
  }
  const [a, b] = await Promise.all(
    clients.map((client) => call(client, "rhh_member_workspace")),
  );
  assert.notEqual(a.application.id, b.application.id);
  for (const [i, client] of clients.entries()) {
    const mine = i ? b : a,
      other = i ? a : b;
    assert.equal(mine.application.approval, "pending");
    assert.equal(mine.application.membership, "inactive");
    assert(
      !/internal_notes|stripe_|owner_id|reviewed_by|decision_reason/.test(
        JSON.stringify(mine),
      ),
    );
    for (const field of [
      "owner_id",
      "role",
      "approval",
      "suspended",
      "featured_entitlement",
      "verification",
      "internal_notes",
    ])
      await denied(client, "rhh_save_profile", {
        profile: { ...mine.application.profile, [field]: other.application.id },
        expected_version: mine.application.version,
      });
    const rawRead = await client
      .schema("rhh")
      .from("applications")
      .select("internal_notes")
      .eq("professional_id", other.application.id);
    assert(rawRead.error, "Base table access must remain denied");
    await denied(client, "rhh_create_application", {
      profile: mine.application.profile,
    });
    const saved = await call(client, "rhh_save_profile", {
      profile: mine.application.profile,
      expected_version: mine.application.version,
    });
    assert.equal(saved.application.version, mine.application.version + 1);
    await denied(client, "rhh_save_profile", {
      profile: mine.application.profile,
      expected_version: mine.application.version,
    });
    assert(
      !(await client.auth.refreshSession()).error,
      "Session refresh failed",
    );
    await client.auth.signOut({ scope: "local" });
    await login(client, i ? "B" : "A");
    const persisted = await call(client, "rhh_member_workspace");
    assert.equal(persisted.application.id, mine.application.id);
    assert.equal(persisted.application.version, saved.application.version);
  }
  console.log(
    `PASS: live distinct member identities, own persistence/re-login/refresh, base-table denial, forged/protected fields, duplicate and stale writes. Concurrent creation ${concurrentCreation ? "passed" : "not repeated: test records already existed"}. Test applications retained in staging.`,
  );
} catch (error) {
  // Do not emit provider responses, credentials, session objects or tokens.
  console.error(
    error instanceof assert.AssertionError
      ? `FAIL: ${error.message.split("\n")[0]}`
      : "FAIL: live ownership verification could not complete.",
  );
  process.exitCode = 1;
} finally {
  await Promise.allSettled(
    clients.map((client) => client.auth.signOut({ scope: "local" })),
  );
}
