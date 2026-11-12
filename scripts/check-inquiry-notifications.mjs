import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openInquiryTestDatabase, a, b } from "./lib/inquiry-test-database.mjs";
const db = await openInquiryTestDatabase();
const workerToken = "isolated-notification-worker-token-32-characters";
const admin = "00000000-0000-4000-8000-000000000004";
await db.query(
  "update auth.users set email=case when id=$1 then 'original-member@example.invalid' else 'other-member@example.invalid' end",
  [a],
);
await db.query(
  "insert into auth.users(id,email_confirmed_at,email) values($1,now(),'admin@example.invalid');",
  [admin],
);
await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [admin]);
await db.query("insert into rhh.accounts(user_id,role) values($1,'admin')", [
  admin,
]);
let checks = 0;
function equal(actual, expected) {
  assert.deepEqual(actual, expected);
  checks++;
}
async function denies(fn, code) {
  await assert.rejects(fn, { code });
  checks++;
}
async function rpc(role, uid, name, args = [], worker = false) {
  await db.exec(`set role ${role}`);
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.headers',$2,false)",
    [
      uid,
      JSON.stringify(
        worker ? { "x-rhh-notification-worker": workerToken } : {},
      ),
    ],
  );
  try {
    return (
      await db.query(
        `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) result`,
        args,
      )
    ).rows[0].result;
  } finally {
    await db.exec("reset role");
  }
}
const member = (id, name, args = []) => rpc("authenticated", id, name, args);
const worker = (name, args = []) => rpc("anon", "", name, args, true);
const anon = (name, args = []) => rpc("anon", "", name, args);
await member(b, "rhh_member_workspace");
const application = await member(a, "rhh_create_application", [
  {
    name: "Isolated notification member",
    businessName: "Isolated notification listing",
    email: "private-application@example.invalid",
    publicEmail: "public-contact@example.invalid",
    phone: "",
    website: "",
    city: "Raleigh",
    state: "NC",
    description: "Isolated test-only professional for notification checks.",
    practices: "Isolated healthy-home practices for notification testing.",
    categoryIds: ["mold-inspection"],
    services: ["Test service"],
    listedCredentials: [],
  },
]);
const professional = application.application.id;
await db.query(
  "update rhh.applications set approval='approved' where professional_id=$1",
  [professional],
);
await db.query(
  "update rhh.memberships set status='active' where professional_id=$1",
  [professional],
);
const input = () => ({
  professionalId: professional,
  requestId: randomUUID(),
  name: "Test sender <b>not HTML</b>",
  email: `sender-${randomUUID()}@example.invalid`,
  message: "Private inquiry content must never appear in the notification.",
});
const submit = (payload) => anon("rhh_submit_inquiry", [payload]);
const count = async (table) =>
  (await db.query(`select count(*)::int n from ${table}`)).rows[0].n;
let payload = input();
equal(await submit(payload), { saved: true });
equal(await count("rhh_private.inquiry_email_jobs"), 1);
let job = (await db.query("select * from rhh_private.inquiry_email_jobs"))
  .rows[0];
equal(job.state, "pending");
equal(job.recipient_id, a);
equal(job.recipient_email, "original-member@example.invalid");
equal(await submit(payload), { saved: true });
equal(await count("rhh_private.inquiry_email_jobs"), 1);
for (const extra of [
  { ownerId: b },
  { to: "attacker@example.invalid" },
  { from: "attacker@example.invalid" },
  { origin: "https://untrusted.invalid" },
])
  await denies(() => submit({ ...payload, ...extra }), "22023");
equal(await count("rhh_private.inquiry_email_jobs"), 1);
await db.query(
  "update rhh.applications set suspended=true where professional_id=$1",
  [professional],
);
await denies(() => submit(input()), "PT404");
equal(await count("rhh_private.inquiry_email_jobs"), 1);
await db.query(
  "update rhh.applications set suspended=false where professional_id=$1",
  [professional],
);
await db.exec(
  "alter table rhh_private.inquiry_email_jobs add constraint force_queue_failure check(false) not valid",
);
await denies(() => submit(input()), "23514");
equal(await count("rhh.inquiries"), 1);
equal(await count("rhh_private.inquiry_email_jobs"), 1);
await db.exec(
  "alter table rhh_private.inquiry_email_jobs drop constraint force_queue_failure",
);
for (const name of ["rhh_claim_inquiry_email", "rhh_admin_inquiry_email_jobs"])
  await denies(() => anon(name, name.includes("admin") ? [1] : []), "42501");
await denies(() => worker("rhh_claim_inquiry_email"), "42501");
for (const name of ["rhh_claim_inquiry_email", "rhh_admin_inquiry_email_jobs"])
  await denies(
    () => member(a, name, name.includes("admin") ? [1] : []),
    "42501",
  );
await db.query(
  "insert into rhh_private.inquiry_email_worker_keys(token_hash,enabled,allow_test) values(encode(sha256(convert_to($1,'UTF8')),'hex'),true,true)",
  [workerToken],
);
const claim = () => worker("rhh_claim_inquiry_email");
const prepare = (
  c,
  mode = "test",
  seconds = 3600,
  provider = "recording-test",
  sender = "test-notifications@example.invalid",
  origin = "https://staging.example.invalid",
) =>
  worker("rhh_prepare_inquiry_email", [
    c.id,
    c.lease,
    provider,
    sender,
    origin,
    mode,
    seconds,
  ]);
const finish = (c, outcome, code = "", receipt = null, after = 0) =>
  worker("rhh_finish_inquiry_email", [
    c.id,
    c.lease,
    outcome,
    code,
    receipt,
    after,
  ]);
let c = await claim();
equal(c.id, job.id);
equal(c.attempt, 1);
equal(await claim(), null);
let prepared = await prepare(c);
equal(prepared.to, "original-member@example.invalid");
equal(prepared.from, "test-notifications@example.invalid");
equal(
  Object.keys(prepared).sort(),
  ["id", "inquiryId", "to", "from", "origin", "mode", "idempotencyKey"].sort(),
);
equal(JSON.stringify(prepared).includes(payload.email), false);
equal(JSON.stringify(prepared).includes(payload.message), false);
await denies(() => prepare(c), "PT409");
await denies(() => finish(c, "accepted"), "22023");
equal(await finish(c, "test_recorded"), { state: "test_recorded" });
equal(
  (
    await db.query(
      "select accepted_at from rhh_private.inquiry_email_jobs where id=$1",
      [c.id],
    )
  ).rows[0].accepted_at,
  null,
);
await denies(() => finish(c, "test_recorded"), "PT409");
async function newJob() {
  await db.exec(
    "update rhh_private.inquiry_email_jobs set state='canceled',lease_token=null,lease_until=null,send_started_at=null where state in ('pending','retry','processing'); delete from rhh_private.inquiry_limits",
  );
  const p = input();
  await submit(p);
  return (
    await db.query(
      "select j.id from rhh_private.inquiry_email_jobs j join rhh.inquiries i on i.id=j.inquiry_id where i.sender_email=$1",
      [p.email],
    )
  ).rows[0].id;
}
const due = (id) =>
  db.query(
    "update rhh_private.inquiry_email_jobs set next_attempt_at=clock_timestamp()-interval '1 second' where id=$1",
    [id],
  );
const state = async (id) =>
  (
    await db.query(
      "select state from rhh_private.inquiry_email_jobs where id=$1",
      [id],
    )
  ).rows[0].state;
await newJob();
c = await claim();
await prepare(c);
equal(await finish(c, "temporary", "rate_limited", null, 120), {
  state: "retry",
});
equal(await claim(), null);
equal(
  (
    await db.query(
      "select next_attempt_at>clock_timestamp()+interval '110 seconds' ok from rhh_private.inquiry_email_jobs where id=$1",
      [c.id],
    )
  ).rows[0].ok,
  true,
);
await due(c.id);
c = await claim();
await prepare(c);
equal(await finish(c, "permanent", "rejected"), { state: "failed" });
equal((await member(a, "rhh_inbox", [1])).items.length, 2);
let version = (
  await db.query(
    "select version from rhh_private.inquiry_email_jobs where id=$1",
    [c.id],
  )
).rows[0].version;
await denies(
  () =>
    member(b, "rhh_retry_inquiry_email", [
      c.id,
      version,
      "Forged member retry",
    ]),
  "42501",
);
equal(
  await member(admin, "rhh_retry_inquiry_email", [
    c.id,
    version,
    "Provider configuration reviewed",
  ]),
  { queued: true },
);
await denies(
  () =>
    member(admin, "rhh_retry_inquiry_email", [
      c.id,
      version,
      "Duplicate retry",
    ]),
  "PT409",
);
let operations = await member(admin, "rhh_admin_inquiry_email_jobs", [1]);
for (const secret of [
  "original-member@example.invalid",
  "public-contact@example.invalid",
  "Private inquiry content",
  "recipient_email",
  "provider_message_id",
  "token_hash",
])
  equal(JSON.stringify(operations).includes(secret), false);
const limited = await newJob();
for (let attempt = 1; attempt <= 5; attempt++) {
  c = await claim();
  equal(c.attempt, attempt);
  await prepare(c);
  equal(await finish(c, "temporary", "unavailable"), {
    state: attempt < 5 ? "retry" : "failed",
  });
  await due(limited);
}
for (let manual = 1; manual <= 2; manual++) {
  version = (
    await db.query(
      "select version from rhh_private.inquiry_email_jobs where id=$1",
      [limited],
    )
  ).rows[0].version;
  await member(admin, "rhh_retry_inquiry_email", [
    limited,
    version,
    "Explicit bounded retry",
  ]);
  c = await claim();
  equal(c.attempt, 5 + manual);
  await prepare(c);
  equal(await finish(c, "temporary", "unavailable"), { state: "failed" });
}
version = (
  await db.query(
    "select version from rhh_private.inquiry_email_jobs where id=$1",
    [limited],
  )
).rows[0].version;
await denies(
  () =>
    member(admin, "rhh_retry_inquiry_email", [
      limited,
      version,
      "Beyond retry budget",
    ]),
  "PT409",
);
await newJob();
c = await claim();
await prepare(c, "live", 0, "modeled-live-provider");
equal(await finish(c, "ambiguous", "timeout"), { state: "unknown" });
equal(await claim(), null);
version = (
  await db.query(
    "select version from rhh_private.inquiry_email_jobs where id=$1",
    [c.id],
  )
).rows[0].version;
await denies(
  () =>
    member(admin, "rhh_retry_inquiry_email", [
      c.id,
      version,
      "Unsafe unknown retry",
    ]),
  "PT409",
);
await newJob();
c = await claim();
prepared = await prepare(c, "live", 3600, "modeled-live-provider");
equal(await finish(c, "ambiguous", "network"), { state: "retry" });
await due(c.id);
c = await claim();
equal(
  (await prepare(c, "live", 3600, "modeled-live-provider")).idempotencyKey,
  prepared.idempotencyKey,
);
equal(await finish(c, "accepted", "", "modeled-provider-receipt"), {
  state: "accepted",
});
equal(
  (
    await db.query(
      "select accepted_at is not null ok from rhh_private.inquiry_email_jobs where id=$1",
      [c.id],
    )
  ).rows[0].ok,
  true,
);
await newJob();
c = await claim();
await prepare(c, "live", 3600, "modeled-live-provider");
await finish(c, "ambiguous", "timeout");
await db.query(
  "update rhh_private.inquiry_email_jobs set next_attempt_at=clock_timestamp()-interval '1 second',idempotency_until=clock_timestamp()-interval '1 second' where id=$1",
  [c.id],
);
c = await claim();
equal(await prepare(c, "live", 3600, "modeled-live-provider"), null);
equal(await state(c.id), "unknown");
equal(
  (
    await db.query(
      "select code from rhh_private.inquiry_email_events where job_id=$1 and event='ambiguous' order by occurred_at desc limit 1",
      [c.id],
    )
  ).rows[0].code,
  "idempotency_expired",
);
const abandoned = await newJob();
let old = await claim();
await db.query(
  "update rhh_private.inquiry_email_jobs set lease_until=clock_timestamp()-interval '1 second' where id=$1",
  [abandoned],
);
c = await claim();
equal(c.id, abandoned);
equal(c.attempt, 2);
await denies(() => prepare(old), "PT409");
await prepare(c);
await finish(c, "test_recorded");
await newJob();
old = await claim();
await prepare(old, "live", 0, "modeled-live-provider");
await db.query(
  "update rhh_private.inquiry_email_jobs set lease_until=clock_timestamp()-interval '1 second' where id=$1",
  [old.id],
);
equal(await claim(), null);
equal(await state(old.id), "unknown");
await denies(() => finish(old, "accepted", "", "late-acceptance"), "PT409");
await newJob();
old = await claim();
prepared = await prepare(old, "live", 3600, "modeled-live-provider");
await db.query(
  "update rhh_private.inquiry_email_jobs set lease_until=clock_timestamp()-interval '1 second' where id=$1",
  [old.id],
);
c = await claim();
equal(c.id, old.id);
equal(c.attempt, 2);
await denies(() => finish(old, "accepted", "", "late-response"), "PT409");
equal(
  (await prepare(c, "live", 3600, "modeled-live-provider")).idempotencyKey,
  prepared.idempotencyKey,
);
await finish(c, "accepted", "", "modeled-replayed-receipt");
for (const change of ["email", "role", "banned", "deleted", "ownership"]) {
  await newJob();
  c = await claim();
  if (change === "email")
    await db.query(
      "update auth.users set email='changed@example.invalid' where id=$1",
      [a],
    );
  if (change === "role")
    await db.query("update rhh.accounts set role='admin' where user_id=$1", [
      a,
    ]);
  if (change === "banned")
    await db.query(
      "update auth.users set banned_until=clock_timestamp()+interval '1 day' where id=$1",
      [a],
    );
  if (change === "deleted")
    await db.query(
      "update auth.users set deleted_at=clock_timestamp() where id=$1",
      [a],
    );
  if (change === "ownership")
    await db.query("update rhh.professionals set owner_id=$1 where id=$2", [
      b,
      professional,
    ]);
  equal(await prepare(c), null);
  equal(await state(c.id), "canceled");
  equal(
    (
      await db.query(
        "select recipient_id,recipient_email from rhh_private.inquiry_email_jobs where id=$1",
        [c.id],
      )
    ).rows[0],
    { recipient_id: a, recipient_email: "original-member@example.invalid" },
  );
  await db.query(
    "update auth.users set email='original-member@example.invalid',banned_until=null,deleted_at=null where id=$1",
    [a],
  );
  await db.query("update rhh.accounts set role='member' where user_id=$1", [a]);
  await db.query("update rhh.professionals set owner_id=$1 where id=$2", [
    a,
    professional,
  ]);
}
await newJob();
c = await claim();
await prepare(c);
await finish(c, "temporary", "unavailable");
await due(c.id);
c = await claim();
equal(
  await prepare(
    c,
    "test",
    3600,
    "recording-test",
    "changed-sender@example.invalid",
  ),
  null,
);
equal(await state(c.id), "unknown");
await newJob();
c = await claim();
await db.query(
  "update rhh_private.inquiry_email_jobs set created_at=clock_timestamp()-interval '25 hours' where id=$1",
  [c.id],
);
equal(await prepare(c), null);
equal(await state(c.id), "canceled");
for (const role of [
  "anon",
  "authenticated",
  "rhh_member_writer",
  "rhh_admin_writer",
  "rhh_notification_worker",
]) {
  equal(
    (
      await db.query(
        "select has_table_privilege($1,'rhh_private.inquiry_email_worker_keys','select') allowed",
        [role],
      )
    ).rows[0].allowed,
    false,
  );
}
equal(
  (
    await db.query(
      "select has_column_privilege('rhh_admin_writer','rhh_private.inquiry_email_jobs','recipient_email','select') allowed",
    )
  ).rows[0].allowed,
  false,
);
equal(
  (
    await db.query(
      "select has_table_privilege('rhh_notification_worker','rhh.inquiries','select') allowed",
    )
  ).rows[0].allowed,
  false,
);
for (const column of [
  "recipient_id",
  "recipient_email",
  "inquiry_id",
  "created_at",
  "manual_retries",
])
  equal(
    (
      await db.query(
        "select has_column_privilege('rhh_notification_worker','rhh_private.inquiry_email_jobs',$1,'update') allowed",
        [column],
      )
    ).rows[0].allowed,
    false,
  );
equal(
  (
    await db.query(
      "select count(*)::int n from pg_roles where rolname='rhh_notification_worker' and (rolcanlogin or rolbypassrls)",
    )
  ).rows[0].n,
  0,
);
equal(
  (
    await db.query(
      "select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rhh_private' and p.prosecdef and not(p.proconfig @> array['search_path=\"\"'])",
    )
  ).rows[0].n,
  0,
);
console.log(
  `PASS: ${checks} notification database checks; isolated Auth fixtures and modeled provider outcomes, no real email. Concurrency uses separate hosted acceptance, not this single-connection engine.`,
);
await db.close();
