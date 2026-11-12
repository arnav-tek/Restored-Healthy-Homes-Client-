// Real parallel HTTP claims using a temporary, private operator-created fixture.
// No Auth identities are fabricated and no email/provider is called. Prepare and
// cleanup SQL is executed separately by the authorized staging operator.
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, unlink, access } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* The caller can supply its secure environment. */
}
assert.equal(process.env.RHH_APP_MODE, "staging");
assert.equal(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "https://xjecnuebalmmblowmtks.supabase.co",
);
assert.match(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  /^sb_publishable_/,
);
const folder = "output/private";
const manifestPath = `${folder}/notification-claim-test.json`;
const secretPath = `${folder}/notification-claim-test-secret`;
const claimsPath = `${folder}/notification-claim-test-leases.json`;
const phase = process.argv[2];
const operatorFiles = [
  "notification-claim-seed.sql",
  "notification-claim-expire.sql",
  "notification-claim-cleanup.sql",
];
function operatorSql(m) {
  const list = (values) => values.map((value) => `'${value}'`).join(",");
  const recipient = "6f2e31ac-272a-4ee8-8a0a-e9fc73ffcb4c";
  const values = m.inquiryIds
    .map(
      (value) =>
        `('${value}','${m.professionalId}','${recipient}','PRIVATE QUEUE TEST ONLY','queue-test@example.invalid','Temporary notification concurrency fixture; no email is sent.')`,
    )
    .join(",");
  return [
    `begin; set local lock_timeout='5s';
do $$ begin if exists(select 1 from rhh_private.inquiry_email_jobs) or exists(select 1 from rhh_private.inquiry_email_worker_keys) then raise exception 'Existing queue or worker configuration; stop';end if;
if not exists(select 1 from rhh.accounts where user_id='${recipient}' and role='admin') then raise exception 'Expected test recipient role unavailable';end if;end $$;
insert into rhh.professionals(id,owner_id,business_name,city,state,description,healthy_home_practices) values('${m.professionalId}',null,'PRIVATE NOTIFICATION CONCURRENCY TEST ONLY','Raleigh','NC','Temporary private test fixture; no application, membership or publication.','Temporary private test fixture only, not a client listing.');
insert into rhh.inquiries(id,professional_id,recipient_id,sender_name,sender_email,message) values ${values};
insert into rhh_private.inquiry_email_worker_keys(token_hash,enabled,allow_test) values('${m.tokenHash}',true,true);
update rhh_private.inquiry_email_jobs set state='pending',failure_code='',delivery_mode='test' where inquiry_id in (${list(m.inquiryIds)});
select json_agg(id) as job_ids from rhh_private.inquiry_email_jobs where inquiry_id in (${list(m.inquiryIds)});commit;`,
    `begin;update rhh_private.inquiry_email_jobs set lease_until=clock_timestamp()-interval '1 second' where inquiry_id in (${list(m.inquiryIds)}) and state='processing' and delivery_mode='test';commit;`,
    `begin;do $$ begin if not exists(select 1 from rhh.professionals where id='${m.professionalId}' and owner_id is null and business_name='PRIVATE NOTIFICATION CONCURRENCY TEST ONLY') then raise exception 'Fixture guard failed';end if;
if (select count(*) from rhh.inquiries where id in (${list(m.inquiryIds)}) and professional_id='${m.professionalId}' and recipient_id='${recipient}' and sender_email='queue-test@example.invalid')<>3 then raise exception 'Fixture inquiry guard failed';end if;
if (select count(*) from rhh_private.inquiry_email_jobs where inquiry_id in (${list(m.inquiryIds)}) and state='canceled' and delivery_mode='test' and attempts=2 and accepted_at is null and provider_message_id is null)<>3 then raise exception 'Unexpected job outcome; preserve for reconciliation';end if;end $$;
delete from rhh_private.inquiry_email_events where job_id in (select id from rhh_private.inquiry_email_jobs where inquiry_id in (${list(m.inquiryIds)}));
delete from rhh_private.inquiry_email_jobs where inquiry_id in (${list(m.inquiryIds)});
delete from rhh.inquiries where id in (${list(m.inquiryIds)}) and professional_id='${m.professionalId}';
delete from rhh.professionals where id='${m.professionalId}' and owner_id is null and business_name='PRIVATE NOTIFICATION CONCURRENCY TEST ONLY';
delete from rhh_private.inquiry_email_worker_keys where token_hash='${m.tokenHash}' and allow_test;
select (select count(*) from rhh.professionals where id='${m.professionalId}') fixture_profiles,(select count(*) from rhh.inquiries where id in (${list(m.inquiryIds)})) fixture_inquiries,(select count(*) from rhh_private.inquiry_email_jobs where inquiry_id in (${list(m.inquiryIds)})) fixture_jobs,(select count(*) from rhh_private.inquiry_email_worker_keys where token_hash='${m.tokenHash}') temporary_keys;commit;`,
  ];
}
if (phase === "--prepare") {
  await mkdir(folder, { recursive: true });
  let exists = false;
  try {
    await access(manifestPath);
    exists = true;
  } catch {
    /* First run. */
  }
  assert.equal(
    exists,
    false,
    "Existing test manifest must be reconciled before creating another fixture.",
  );
  const secret = randomBytes(32).toString("base64url");
  const manifest = {
    project: "xjecnuebalmmblowmtks",
    professionalId: randomUUID(),
    inquiryIds: [randomUUID(), randomUUID(), randomUUID()],
    jobIds: [],
    tokenHash: createHash("sha256").update(secret).digest("hex"),
    createdAt: new Date().toISOString(),
  };
  await writeFile(secretPath, secret, { mode: 0o600 });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), {
    mode: 0o600,
  });
  const sql = operatorSql(manifest);
  assert.ok(sql.every((value) => !value.includes(secret)));
  for (let index = 0; index < operatorFiles.length; index++)
    await writeFile(`${folder}/${operatorFiles[index]}`, sql[index], {
      mode: 0o600,
    });
  console.log(
    "Prepared private test manifest and ephemeral capability. No secret printed or database changed.",
  );
  process.exit(0);
}
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(manifest.project, "xjecnuebalmmblowmtks");
if (phase === "--record-jobs") {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const ids = JSON.parse(input);
  assert.ok(
    Array.isArray(ids) &&
      ids.length === 3 &&
      new Set(ids).size === 3 &&
      ids.every(
        (value) =>
          typeof value === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value,
          ),
      ),
  );
  manifest.jobIds = ids;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), {
    mode: 0o600,
  });
  console.log("Recorded three operator-confirmed fixture job IDs.");
  process.exit(0);
}
if (phase === "--cleanup-local") {
  for (const path of [
    secretPath,
    claimsPath,
    manifestPath,
    ...operatorFiles.map((name) => `${folder}/${name}`),
  ])
    try {
      await unlink(path);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  console.log("Removed this test run’s local capability and lease files.");
  process.exit(0);
}
const secret = await readFile(secretPath, "utf8");
assert.equal(
  createHash("sha256").update(secret).digest("hex"),
  manifest.tokenHash,
);
assert.equal(
  manifest.jobIds.length,
  3,
  "Operator must populate exactly three fixture job IDs first.",
);
const clients = Array.from({ length: 3 }, () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "x-rhh-notification-worker": secret } },
    },
  ),
);
async function claims() {
  const all = [];
  for (let wave = 0; wave < 5 && all.length < 3; wave++) {
    const responses = await Promise.all(
      clients.map((client) => client.rpc("rhh_claim_inquiry_email")),
    );
    for (const response of responses) {
      assert.equal(response.error, null);
      if (response.data !== null) {
        assert.ok(
          manifest.jobIds.includes(response.data.id),
          "A non-fixture job was returned; stop without preparing it.",
        );
        assert.equal(
          all.some((x) => x.id === response.data.id),
          false,
          "Concurrent workers claimed the same job.",
        );
        all.push(response.data);
      }
    }
  }
  assert.equal(all.length, 3);
  return all;
}
const prepare = (client, claim) =>
  client.rpc("rhh_prepare_inquiry_email", {
    target: claim.id,
    claim_token: claim.lease,
    provider: "recording-test",
    sender: "notification-test@example.invalid",
    origin: "http://127.0.0.1:3230",
    mode: "test",
    idempotency_seconds: 3600,
  });
if (phase === "--claim") {
  const held = await claims();
  assert.ok(held.every((x) => x.attempt === 1));
  const again = await Promise.all(
    clients.map((client) => client.rpc("rhh_claim_inquiry_email")),
  );
  assert.ok(
    again.every((x) => x.error === null && x.data === null),
    "Unexpired jobs were reclaimed.",
  );
  await writeFile(claimsPath, JSON.stringify(held), { mode: 0o600 });
  console.log(
    "PASS: three real parallel HTTP workers claimed three unique jobs; active leases prevented repeated claims. No provider called.",
  );
} else if (phase === "--recover") {
  const old = JSON.parse(await readFile(claimsPath, "utf8"));
  for (const held of old) {
    const denied = await prepare(clients[0], held);
    assert.equal(
      denied.error?.code,
      "PT409",
      "Expired lease could still prepare a send.",
    );
  }
  const recovered = await claims();
  assert.ok(
    recovered.every(
      (x) =>
        x.attempt === 2 && x.lease !== old.find((y) => y.id === x.id)?.lease,
    ),
  );
  for (const held of recovered) {
    const result = await prepare(clients[0], held);
    assert.equal(result.error, null);
    assert.equal(
      result.data,
      null,
      "An ownerless test fixture must be canceled before delivery.",
    );
  }
  console.log(
    "PASS: hosted expired leases recovered with new fencing tokens; stale workers denied; unavailable recipients canceled before any test/provider send.",
  );
} else throw new Error("Use --prepare, --claim, --recover or --cleanup-local.");
