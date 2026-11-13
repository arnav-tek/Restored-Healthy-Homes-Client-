import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  ),
  id = "40000000-0000-4000-8000-0000000000f6";
if (process.argv.includes("--submit")) {
  const m = JSON.parse(
    await readFile(
      new URL("../output/step6-live-fixture.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(m.professionalId, id);
  const { data, error } = await client.rpc("rhh_public_directory");
  assert.equal(error, null);
  assert.ok(
    data.profiles.some(
      (p) =>
        p.id === id &&
        p.businessName === "STEP6 REVIEW ACCEPTANCE TEST - TEMPORARY",
    ),
    "Operator fixture must be present before test writes",
  );
  const { professionalId, ...payload } = m;
  void professionalId;
  const results = await Promise.all(
    Array.from({ length: 6 }, () =>
      client.rpc("rhh_submit_review", { target: id, payload }),
    ),
  );
  for (const r of results) {
    assert.equal(r.error, null);
    assert.deepEqual(r.data, { saved: true });
  }
  const duplicate = await client.rpc("rhh_submit_review", {
    target: id,
    payload: { ...payload, requestId: randomUUID() },
  });
  assert.equal(duplicate.error, null);
  const second = await client.rpc("rhh_submit_review", {
    target: id,
    payload: {
      ...payload,
      requestId: randomUUID(),
      rating: 1,
      body: "STEP6 ACCEPTANCE: second temporary service-review test, not a real customer experience.",
    },
  });
  assert.equal(second.error, null);
  console.log(
    "PASS: six concurrent real anonymous submissions and normalized duplicate/second-score receipts accepted. Verify row/event uniqueness through the protected operator aggregate; no private review read claimed.",
  );
} else {
  let n = 0;
  for (const [name, args] of [
    ["rhh_admin_reviews", { filters: {} }],
    ["rhh_member_reviews", {}],
    [
      "rhh_moderate_review",
      {
        payload: {
          id: randomUUID(),
          version: 1,
          action: "publish",
          reason: "Forged anonymous action",
          note: "",
        },
      },
    ],
  ]) {
    const r = await client.rpc(name, args);
    assert.ok(r.error);
    assert.equal(r.data, null);
    n++;
  }
  const forged = await client.rpc("rhh_submit_review", {
    target: id,
    payload: {
      requestId: randomUUID(),
      displayName: "Test",
      rating: 5,
      body: "A forged public status must never be accepted.",
      status: "published",
    },
  });
  assert.ok(forged.error);
  n++;
  console.log(
    `PASS: ${n} real anonymous staging private-read/moderation/protected-submission denials.`,
  );
  for (const [scope, method, origin, status] of [
    ["admin", "GET", "", 401],
    ["member", "GET", "", 401],
    ["admin", "POST", "http://127.0.0.1:3230", 401],
    ["public", "POST", "https://evil.invalid", 403],
  ]) {
    const path =
      scope === "public"
        ? `/api/public/reviews/${id}`
        : `/api/${scope}/reviews`;
    const r = await fetch("http://127.0.0.1:3230" + path, {
      method,
      headers: { origin, "content-type": "application/json" },
      ...(method === "POST" ? { body: "{}" } : {}),
    });
    assert.equal(r.status, status);
    assert.match(r.headers.get("cache-control"), /private/);
    assert.match(r.headers.get("cache-control"), /no-store/);
    assert.doesNotMatch(
      await r.text(),
      /recipientEmail|contact_email|actorId|sb_secret_/,
    );
  }
  console.log(
    "PASS: four real local website review authorization/origin/private-cache checks.",
  );
}
