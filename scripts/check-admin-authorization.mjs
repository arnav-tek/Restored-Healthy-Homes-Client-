import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } =
  await import("../output/database-test/node_modules/@electric-sql/pglite/dist/index.js");
const db = new PGlite();
const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
const unconfirmed = "00000000-0000-4000-8000-000000000003";
await db.exec(`create role anon; create role authenticated; create schema auth;
  create table auth.users(id uuid primary key, email_confirmed_at timestamptz, email text, banned_until timestamptz, deleted_at timestamptz, is_anonymous boolean default false);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create table auth.sessions(id uuid primary key, user_id uuid references auth.users(id), not_after timestamptz);
  create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('session_id',coalesce(nullif(current_setting('request.jwt.claim.session_id',true),''),auth.uid()::text)) $$;
  grant usage on schema auth to authenticated;
  insert into auth.users(id,email_confirmed_at) values('${a}',now()),('${b}',now()),('${unconfirmed}',null);`);
for (const file of [
  "20261107231103_database_foundation.sql",
  "20261108204528_member_ownership_and_applications.sql",
  "20261109015601_retain_assigned_inactive_categories.sql",
  "20261110001526_admin_application_management.sql",
  "20261111031243_public_professional_name.sql",
  "20261111032715_enforce_current_auth_session.sql",
  "20261112001517_restore_executor_auth_schema_usage.sql",
  "20261112001903_isolate_executor_identity_lookup.sql",
  "20261112005238_profile_inquiries_and_inbox.sql",
  "20261112012923_inquiry_rpc_http_statuses.sql",
  "20261112025714_inquiry_notification_outbox.sql",
  "20261112030645_notification_event_outcome_accuracy.sql",
  "20261112031605_restrict_notification_worker_routing_updates.sql",
]) {
  if (file === "20261112001903_isolate_executor_identity_lookup.sql")
    await db.exec(
      "revoke usage on schema auth from rhh_member_writer,rhh_admin_writer,rhh_public_reader",
    );
  await db.exec(
    await readFile(
      new URL(`../supabase/migrations/${file}`, import.meta.url),
      "utf8",
    ),
  );
}
await db.exec(
  "insert into auth.sessions(id,user_id) select id,id from auth.users",
);
let assertions = 0;
async function asMember(id, sql, params = []) {
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`,
  );
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}
async function rpc(id, name, args = []) {
  const r = await asMember(
    id,
    `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as result`,
    args,
  );
  return r.rows[0].result;
}
async function denies(fn, message) {
  await assert.rejects(fn, message);
  assertions++;
}
const profile = {
  name: "Private application contact",
  publicDisplayName: "Public professional",
  businessName: "Ownership test business",
  email: "test@example.invalid",
  phone: "",
  website: "",
  city: "Raleigh",
  state: "NC",
  description: "Test-only business description for ownership checks.",
  practices: "Test-only healthy-home practices for validation.",
  categoryIds: ["mold-inspection"],
  services: ["Test service"],
  listedCredentials: ["Test claim"],
};

const admin = "00000000-0000-4000-8000-000000000004";
await db.query(
  "insert into auth.users(id,email_confirmed_at) values($1,now())",
  [admin],
);
// Run the actual trusted-operator procedure against isolated accounts.
await db.exec("alter table auth.users add column if not exists email text");
await db.query(
  "update auth.users set email='admin@example.invalid' where id=$1",
  [admin],
);
await db.query(
  "update auth.users set email='admin@example.invalid' where id=$1",
  [unconfirmed],
);
const assignment = (
  await readFile(
    new URL("../supabase/assign-website-admin.sql", import.meta.url),
    "utf8",
  )
)
  .replace("00000000-0000-0000-0000-000000000000", admin)
  .replace("CONFIRMED_ACCOUNT_EMAIL", "admin@example.invalid");
await db.exec(assignment);
await db.exec(assignment);
assert.equal(
  (await db.query("select count(*)::int n from rhh.account_role_history"))
    .rows[0].n,
  1,
);
assertions++;
for (const invalid of [
  assignment.replace("admin@example.invalid", "wrong@example.invalid"),
  assignment.replaceAll(admin, unconfirmed),
]) {
  await denies(
    () => db.exec(invalid),
    /Confirmed intended Auth account required/,
  );
  await db.exec("rollback");
}
await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [admin]);
await denies(() => rpc("", "rhh_admin_workspace"), /admin_required/);
await denies(() => rpc(a, "rhh_admin_workspace"), /admin_required/);
await denies(() => rpc(unconfirmed, "rhh_admin_workspace"), /admin_required/);
await asMember(a, "select set_config('request.jwt.claims',$1,false)", [
  JSON.stringify({
    sub: a,
    user_metadata: { role: "admin" },
    app_metadata: { role: "admin" },
  }),
]);
await denies(() => rpc(a, "rhh_admin_workspace"), /admin_required/);
const made = await rpc(a, "rhh_create_application", [profile]);
await rpc(b, "rhh_create_application", [
  { ...profile, businessName: "Private member B" },
]);
const id = made.application.id;
await denies(
  () =>
    asMember(a, "update rhh.accounts set role='admin' where user_id=$1", [a]),
  /permission denied/,
);
await denies(
  () => asMember(a, "select * from rhh.applications"),
  /permission denied/,
);
await denies(
  () =>
    rpc(a, "rhh_admin_decide", [
      id,
      1,
      1,
      "approve",
      "Forged decision",
      "secret",
    ]),
  /admin_required/,
);
const initial = await rpc(admin, "rhh_admin_workspace");
assert.equal((await rpc("", "rhh_public_directory")).profiles.length, 0);
assertions++;
assert.equal(initial.applications.length, 2);
assertions++;
const approved = await rpc(admin, "rhh_admin_decide", [
  id,
  1,
  1,
  "approve",
  "Reviewed application",
  "Private admin note",
]);
assert.equal(
  approved.applications.find((x) => x.id === id).approval,
  "approved",
);
assertions++;
const member = await rpc(a, "rhh_member_workspace");
assert.equal(member.application.membership, "inactive");
assertions++;
assert.equal(member.application.decisionReason, "Reviewed application");
assertions++;
assert.equal(JSON.stringify(member).includes("Private admin note"), false);
assertions++;
assert.equal((await rpc("", "rhh_public_directory")).profiles.length, 0);
assertions++;
await denies(
  () =>
    rpc(admin, "rhh_admin_decide", [id, 1, 1, "reject", "Stale decision", ""]),
  /stale_decision/,
);
await denies(
  () =>
    rpc(admin, "rhh_admin_decide", [
      id,
      1,
      2,
      "approve",
      "Repeated approval",
      "",
    ]),
  /invalid_transition/,
);
await denies(
  () =>
    rpc(admin, "rhh_admin_decide", [
      id,
      1,
      2,
      "activate",
      "Forged payment",
      "",
    ]),
  /invalid_decision/,
);
await denies(
  () => rpc(admin, "rhh_admin_decide", [id, 1, 2, "suspend", "x", ""]),
  /invalid_decision/,
);
// Controlled local fixture only: there is no membership activation RPC.
await db.query(
  "update rhh.memberships set status='active' where professional_id=$1",
  [id],
);
let published = await rpc("", "rhh_public_directory");
assert.equal(published.profiles.length, 1);
assertions++;
assert.equal(published.profiles[0].id, id);
assertions++;
assert.equal(published.profiles[0].publicDisplayName, "Public professional");
assertions++;
assert.equal(
  /internalNotes|Private admin note|Private application contact|test@example.invalid|contact_name|owner_id|actorId|stripe_|decisionReason/.test(
    JSON.stringify(published),
  ),
  false,
);
assertions++;
await rpc(admin, "rhh_admin_decide", [
  id,
  1,
  2,
  "suspend",
  "Temporary suspension",
  "Private suspension note",
]);
assert.equal((await rpc("", "rhh_public_directory")).profiles.length, 0);
assertions++;
assert.equal(
  (await rpc(a, "rhh_member_workspace")).application.suspended,
  true,
);
assertions++;
await rpc(admin, "rhh_admin_decide", [
  id,
  1,
  3,
  "reject",
  "Further review needed",
  "",
]);
assert.equal((await rpc("", "rhh_public_directory")).profiles.length, 0);
assertions++;
await rpc(admin, "rhh_admin_decide", [
  id,
  1,
  4,
  "approve",
  "Review completed",
  "",
]);
assert.equal((await rpc("", "rhh_public_directory")).profiles.length, 0);
assertions++;
await rpc(admin, "rhh_admin_decide", [
  id,
  1,
  5,
  "reinstate",
  "Issue resolved",
  "",
]);
assert.equal((await rpc("", "rhh_public_directory")).profiles.length, 1);
assertions++;
await rpc(a, "rhh_save_profile", [
  { ...profile, businessName: "Member edit after review" },
  1,
]);
await denies(
  () =>
    rpc(admin, "rhh_admin_decide", [
      id,
      1,
      6,
      "reject",
      "Outdated profile review",
      "",
    ]),
  /stale_decision/,
);
const saved = await rpc(admin, "rhh_admin_workspace");
const record = saved.applications.find((x) => x.id === id);
assert.equal(record.history.length, 5);
assertions++;
assert.equal(
  record.history.every((h) => h.actorId === admin && h.decidedAt),
  true,
);
assertions++;
assert.equal(record.decisionVersion, 6);
assertions++;
assert.equal(
  (await rpc(a, "rhh_member_workspace")).application.approval,
  "approved",
);
assertions++;
await denies(
  () => asMember(admin, "update rhh.memberships set status='active'"),
  /permission denied/,
);
await denies(
  () => asMember(admin, "delete from rhh.application_decisions"),
  /permission denied/,
);
// Active membership alone cannot publish either a pending or rejected record.
const pendingB = (await rpc(b, "rhh_member_workspace")).application;
await db.query(
  "update rhh.memberships set status='active' where professional_id=$1",
  [pendingB.id],
);
assert.equal(
  (await rpc("", "rhh_public_directory")).profiles.some(
    (p) => p.id === pendingB.id,
  ),
  false,
);
assertions++;
await rpc(admin, "rhh_admin_decide", [
  pendingB.id,
  pendingB.version,
  1,
  "reject",
  "Test application rejected",
  "Private rejection note",
]);
assert.equal(
  (await rpc("", "rhh_public_directory")).profiles.some(
    (p) => p.id === pendingB.id,
  ),
  false,
);
assertions++;
// Explicit public names survive fresh reads; clearing never reveals private contacts.
await db.exec("set role anon");
await denies(
  () => db.query("select public_display_name from rhh.professionals"),
  /permission denied/,
);
await db.exec("reset role");
for (const publicDisplayName of ["Updated public professional", ""]) {
  const before = await rpc(a, "rhh_member_workspace");
  await rpc(a, "rhh_save_profile", [
    { ...before.application.profile, publicDisplayName },
    before.application.version,
  ]);
  await db.exec("set role anon");
  const fresh = (await db.query("select public.rhh_public_directory() result"))
    .rows[0].result;
  await db.exec("reset role");
  assert.equal(fresh.profiles[0].publicDisplayName, publicDisplayName);
  assertions++;
  assert.equal(
    JSON.stringify(fresh).includes("Private application contact"),
    false,
  );
  assertions++;
  assert.equal(
    (await rpc(a, "rhh_member_workspace")).application.profile
      .publicDisplayName,
    publicDisplayName,
  );
  assertions++;
  assert.equal(
    (await rpc(admin, "rhh_admin_workspace")).applications.find(
      (x) => x.id === id,
    ).profile.publicDisplayName,
    publicDisplayName,
  );
  assertions++;
}
// Inspect the installed objects, not merely the migration source.
assert.equal(
  (
    await db.query(
      "select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='rhh' and c.relkind='r' and not(c.relrowsecurity and c.relforcerowsecurity)",
    )
  ).rows[0].n,
  0,
);
assertions++;
assert.equal(
  (
    await db.query(
      "select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('rhh','public') and c.relkind in ('v','m')",
    )
  ).rows[0].n,
  0,
);
assertions++;
for (const role of ["anon", "authenticated"]) {
  const callable = (
    await db.query(
      "select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'rhh_%' and has_function_privilege($1,p.oid,'execute') order by p.proname",
      [role],
    )
  ).rows.map((x) => x.proname);
  assert.deepEqual(
    callable,
    role === "anon"
      ? [
          "rhh_claim_inquiry_email",
          "rhh_finish_inquiry_email",
          "rhh_prepare_inquiry_email",
          "rhh_public_directory",
          "rhh_submit_inquiry",
        ]
      : [
          "rhh_admin_decide",
          "rhh_admin_inquiry_email_jobs",
          "rhh_admin_workspace",
          "rhh_create_application",
          "rhh_inbox",
          "rhh_member_workspace",
          "rhh_public_directory",
          "rhh_read_inquiry",
          "rhh_retry_inquiry_email",
          "rhh_save_profile",
          "rhh_set_inquiry_read",
          "rhh_submit_inquiry",
        ],
  );
  assertions++;
}
assert.equal(
  (
    await db.query(
      "select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rhh_private' and p.prosecdef and not (p.proconfig @> array['search_path=\"\"'])",
    )
  ).rows[0].n,
  0,
);
assertions++;
// Direct RPCs must reject a revoked/expired session even with a previously valid UID.
for (const [uid, name, message] of [
  [a, "rhh_member_workspace", /confirmed_identity_required/],
  [admin, "rhh_admin_workspace", /admin_required/],
]) {
  await db.query(
    "update auth.sessions set not_after=now()-interval '1 second' where user_id=$1",
    [uid],
  );
  await denies(() => rpc(uid, name), message);
  await db.query("delete from auth.sessions where user_id=$1", [uid]);
  await denies(() => rpc(uid, name), message);
  if (uid === admin)
    await denies(
      () =>
        rpc(uid, "rhh_admin_decide", [
          id,
          4,
          6,
          "reject",
          "Revoked session",
          "",
        ]),
      message,
    );
  else await denies(() => rpc(uid, "rhh_save_profile", [profile, 4]), message);
  await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [uid]);
  await db.query("select set_config('request.jwt.claim.session_id',$1,false)", [
    b,
  ]);
  await denies(() => rpc(uid, name), message);
  await db.query("select set_config('request.jwt.claim.session_id','',false)");
}
await denies(
  () => asMember(a, "select * from auth.sessions"),
  /permission denied/,
);
await denies(
  () => asMember(a, "select rhh_private.has_current_session()"),
  /permission denied/,
);
// Demotion takes effect without issuing a new JWT or trusting stale browser state.
await db.query("update rhh.accounts set role='member' where user_id=$1", [
  admin,
]);
await denies(() => rpc(admin, "rhh_admin_workspace"), /admin_required/);
await denies(
  () =>
    rpc(admin, "rhh_admin_decide", [
      id,
      2,
      6,
      "reject",
      "Revoked administrator",
      "",
    ]),
  /admin_required/,
);
await db.exec("set role anon");
await denies(
  () => db.query("select public.rhh_admin_workspace()"),
  /permission denied/,
);
assert.equal(
  (await db.query("select public.rhh_public_directory() result")).rows[0].result
    .profiles.length,
  1,
);
assertions++;
await db.exec("reset role");
console.log(
  `PASS: ${assertions} Stage 4 database checks; simulated Auth identities, local PostgreSQL-compatible execution only.`,
);
await db.close();
