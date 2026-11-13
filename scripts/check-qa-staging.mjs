import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
assert.equal(process.env.RHH_APP_MODE, "staging");
assert.equal(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "https://xjecnuebalmmblowmtks.supabase.co",
);
const origin = process.env.RHH_AUTH_ORIGIN;
assert.equal(origin, "http://127.0.0.1:3230");
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
const file = "output/private/qa-acceptance-test.json";
if (process.argv.includes("--cleanup-local")) {
  await unlink(file);
  console.log(
    "Removed local test manifest after operator-verified database cleanup.",
  );
  process.exit(0);
}
if (process.argv.includes("--submit")) {
  let exists = true;
  try {
    await readFile(file);
  } catch {
    exists = false;
  }
  assert.equal(exists, false, "Reconcile existing test manifest first");
  const { data, error } = await client.rpc("rhh_public_qa", { target: null });
  assert.equal(error, null);
  const category = data.catalog.find((c) => c.active);
  assert.ok(category);
  const token = randomUUID();
  const request = {
    requestId: randomUUID(),
    title: "STAGING QA ACCEPTANCE TEST - " + token,
    body:
      "Test-only saved question for staging acceptance. No homeowner contact or medical information. Reference " +
      token,
    categoryId: category.id,
  };
  await mkdir("output/private", { recursive: true });
  await writeFile(
    file,
    JSON.stringify({ request, createdAt: new Date().toISOString() }, null, 2),
    { mode: 0o600 },
  );
  const responses = await Promise.all(
    Array.from({ length: 7 }, () =>
      fetch(origin + "/api/questions", {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(30000),
      }),
    ),
  );
  for (const r of responses) {
    assert.equal(r.status, 200);
    assert.match(r.headers.get("cache-control") ?? "", /no-store/);
    assert.deepEqual(await r.json(), { saved: true, status: "pending" });
  }
  console.log(
    "PASS: seven real parallel website submissions acknowledged one request with a private pending receipt. Operator count/cleanup verification remains required.",
  );
} else {
  const manifest = JSON.parse(await readFile(file, "utf8"));
  assert.ok(
    manifest.questionId,
    "Record the operator-verified test question ID first",
  );
  const { data, error } = await client.rpc("rhh_public_qa", {
    target: manifest.questionId,
  });
  assert.equal(error, null);
  assert.equal(data.questions.length, 0);
  for (const rsc of [false, true]) {
    const r = await fetch(origin + "/questions/" + manifest.questionId, {
      headers: rsc ? { RSC: "1" } : {},
      signal: AbortSignal.timeout(20000),
    });
    const text = await r.text();
    assert.equal(r.status, rsc ? 200 : 404);
    assert.ok(text.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
    assert.equal(text.includes(manifest.request.title), false);
    assert.equal(text.includes(manifest.request.body), false);
  }
  const results = await fetch(
    origin + "/questions?q=" + manifest.request.requestId,
  );
  const text = await results.text();
  assert.match(text, /0 matching questions/);
  assert.equal(text.includes(manifest.request.title), false);
  const forged = await client.rpc("rhh_submit_question", {
    payload: { ...manifest.request, ownerId: "forged" },
  });
  assert.ok(forged.error);
  const conflict = await client.rpc("rhh_submit_question", {
    payload: {
      ...manifest.request,
      body: "Different test question body that must not overwrite the saved record.",
    },
  });
  assert.equal(conflict.error?.code, "PT409");
  const inbox = await client.rpc("rhh_member_qa", {
    target: manifest.questionId,
    page_number: 1,
  });
  assert.ok(inbox.error);
  const answer = await client.rpc("rhh_submit_answer", {
    payload: {
      questionId: manifest.questionId,
      body: "Forged answer that must remain denied.",
    },
  });
  assert.ok(answer.error);
  const raw = await client.schema("rhh").from("questions").select("*");
  assert.ok(raw.error);
  const website = await fetch(
    origin + "/api/member/questions?question=" + manifest.questionId,
  );
  assert.equal(website.status, 401);
  const cross = await fetch(origin + "/api/questions", {
    method: "POST",
    headers: {
      origin: "https://evil.invalid",
      "content-type": "application/json",
    },
    body: "{}",
  });
  assert.equal(cross.status, 403);
  console.log(
    "PASS: 11 real anonymous staging publication, HTML/RSC, protected-field, duplicate-conflict, member-denial and private-schema/API checks. No authenticated acceptance claimed.",
  );
  console.log({
    memberATestLoginReady: !!(
      process.env.RHH_TEST_MEMBER_A_EMAIL &&
      process.env.RHH_TEST_MEMBER_A_PASSWORD
    ),
    memberBTestLoginReady: !!(
      process.env.RHH_TEST_MEMBER_B_EMAIL &&
      process.env.RHH_TEST_MEMBER_B_PASSWORD
    ),
    realEmailDisabled:
      !process.env.RHH_INQUIRY_EMAIL_PROVIDER ||
      process.env.RHH_INQUIRY_EMAIL_PROVIDER === "disabled",
  });
}
