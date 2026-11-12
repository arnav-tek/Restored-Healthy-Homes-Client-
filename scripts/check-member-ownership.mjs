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
  name: "Test member",
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
await denies(
  () => rpc("", "rhh_member_workspace"),
  /confirmed_identity_required/,
);
await denies(
  () => rpc(unconfirmed, "rhh_member_workspace"),
  /confirmed_identity_required/,
);
await db.exec("set role anon");
await denies(
  () => db.query("select public.rhh_member_workspace()"),
  /permission denied/,
);
await db.exec("reset role");
assert.equal((await rpc(a, "rhh_member_workspace")).application, null);
assertions++;
await rpc(a, "rhh_member_workspace");
assert.equal(
  (await db.query("select count(*)::int n from rhh.accounts")).rows[0].n,
  1,
);
assertions++;
const first = await rpc(a, "rhh_create_application", [profile]);
assert.equal(first.application.approval, "pending");
assert.equal(first.application.membership, "inactive");
assert.equal(first.application.suspended, false);
assertions++;
assert.equal((await rpc(b, "rhh_member_workspace")).application, null);
assertions++;
await denies(
  () => rpc(a, "rhh_create_application", [profile]),
  /application_exists/,
);
for (const [key, value] of Object.entries({
  owner_id: b,
  role: "admin",
  approval: "approved",
  suspended: false,
  membership: "active",
  featured_entitlement: "active",
  internal_notes: "stolen",
  verification: "verified",
})) {
  await denies(
    () => rpc(a, "rhh_save_profile", [{ ...profile, [key]: value }, 1]),
    /invalid_profile/,
  );
}
await denies(
  () => asMember(a, "select internal_notes from rhh.applications"),
  /permission denied/,
);
await denies(
  () => asMember(a, "update rhh.professionals set owner_id=$1", [b]),
  /permission denied/,
);
await denies(() => rpc(b, "rhh_save_profile", [profile, 1]), /stale_profile/);
const second = await rpc(b, "rhh_create_application", [
  { ...profile, businessName: "Member B private business" },
]);
assert.notEqual(first.application.id, second.application.id);
assertions++;
assert.equal(
  (await rpc(a, "rhh_member_workspace")).application.id,
  first.application.id,
);
assertions++;
// Exercise the non-bypass executor's RLS itself, not only function predicates.
await db.exec(
  `set role rhh_member_writer; select set_config('request.jwt.claim.sub','${a}',false);`,
);
assert.equal(
  (await db.query("select id from rhh.professionals")).rows.length,
  1,
);
assertions++;
assert.equal(
  (
    await db.query(
      "update rhh.professionals set business_name=$1 where id=$2",
      ["forged", second.application.id],
    )
  ).affectedRows,
  0,
);
assertions++;
await denies(
  () => db.query("select internal_notes from rhh.applications"),
  /permission denied/,
);
await denies(
  () => db.query("update rhh.applications set approval='approved'"),
  /permission denied/,
);
await denies(
  () => db.query("update rhh.accounts set role='admin'"),
  /permission denied/,
);
await db.exec("reset role");
// A reviewed, unchanged claim survives; a renamed claim starts unverified.
await db.query(
  "update rhh.credentials set verification='verified',reviewed_by=$1,reviewed_at=now() where professional_id=$2",
  [a, first.application.id],
);
await db.query(
  "update rhh.applications set approval='approved',suspended=true,internal_notes='private-test-note' where professional_id=$1",
  [first.application.id],
);
await db.query(
  "update rhh.memberships set status='active',featured_entitlement='active',stripe_customer_id='private-test-billing' where professional_id=$1",
  [first.application.id],
);
const saved = await rpc(a, "rhh_save_profile", [
  {
    ...profile,
    businessName: "Saved member A",
    listedCredentials: ["Test claim", "New claim"],
  },
  1,
]);
assert.equal(saved.application.version, 2);
assert.equal(saved.application.approval, "approved");
assert.equal(saved.application.suspended, true);
assert.equal(saved.application.credentials[0].verification, "verified");
assert.equal(saved.application.credentials[1].verification, "unverified");
assertions++;
assert(
  !JSON.stringify(saved).match(
    /internal_notes|private-test|owner_id|reviewed_by|stripe_|featured/,
  ),
);
assertions++;
await denies(
  () =>
    rpc(a, "rhh_save_profile", [
      { ...profile, businessName: "Stale overwrite" },
      1,
    ]),
  /stale_profile/,
);
assert.equal(
  (await rpc(a, "rhh_member_workspace")).application.profile.businessName,
  "Saved member A",
);
assertions++;
await denies(
  () =>
    rpc(a, "rhh_save_profile", [
      { ...profile, categoryIds: ["invented-category"] },
      2,
    ]),
  /invalid_profile/,
);
assert.equal((await rpc(a, "rhh_member_workspace")).application.version, 2);
assertions++;
// Deliberate late failure proves multi-table write rollback (local test only).
await db.exec(
  "alter table rhh.services add constraint test_late_failure check(name <> 'Fail late')",
);
await db.query("update auth.users set email_confirmed_at=now() where id=$1", [
  unconfirmed,
]);
await denies(
  () =>
    rpc(unconfirmed, "rhh_create_application", [
      { ...profile, services: ["Fail late"] },
    ]),
  /test_late_failure/,
);
assert.equal(
  (
    await db.query(
      "select count(*)::int n from rhh.accounts where user_id=$1",
      [unconfirmed],
    )
  ).rows[0].n,
  0,
);
assertions++;
await denies(
  () =>
    rpc(a, "rhh_save_profile", [
      { ...profile, businessName: "Must roll back", services: ["Fail late"] },
      2,
    ]),
  /test_late_failure/,
);
assert.equal(
  (await rpc(a, "rhh_member_workspace")).application.profile.businessName,
  "Saved member A",
);
assertions++;
assert.equal(
  (await rpc(b, "rhh_member_workspace")).application.profile.businessName,
  "Member B private business",
);
assertions++;
const roles = await db.query(
  "select rolcanlogin,rolbypassrls from pg_roles where rolname='rhh_member_writer'",
);
assert.deepEqual(roles.rows, [{ rolcanlogin: false, rolbypassrls: false }]);
assertions++;
assert.equal(
  (
    await db.query(
      "select has_schema_privilege('authenticated','rhh','usage') allowed",
    )
  ).rows[0].allowed,
  false,
);
assertions++;
// A deactivated assignment remains readable only to its existing owners.
await db.query("update rhh.categories set active=false where id=$1", [
  "mold-inspection",
]);
const inactiveWorkspace = await rpc(a, "rhh_member_workspace");
assert.equal(
  inactiveWorkspace.catalog.find((c) => c.id === "mold-inspection").active,
  false,
);
assert.deepEqual(inactiveWorkspace.application.profile.categoryIds, [
  "mold-inspection",
]);
assertions += 2;
const newcomer = await rpc(unconfirmed, "rhh_member_workspace");
assert.equal(
  newcomer.catalog.some((c) => c.id === "mold-inspection"),
  false,
);
assertions++;
await denies(
  () => rpc(unconfirmed, "rhh_create_application", [profile]),
  /invalid_profile/,
);
await denies(
  () => rpc(a, "rhh_save_profile", [inactiveWorkspace.application.profile, 2]),
  /invalid_profile/,
);
assert.equal((await rpc(a, "rhh_member_workspace")).application.version, 2);
assertions++;
const replacementId = inactiveWorkspace.catalog.find((c) => c.active).id;
const replaced = await rpc(a, "rhh_save_profile", [
  { ...inactiveWorkspace.application.profile, categoryIds: [replacementId] },
  2,
]);
assert.deepEqual(replaced.application.profile.categoryIds, [replacementId]);
assert.equal(replaced.application.version, 3);
assert.equal(
  replaced.catalog.some((c) => c.id === "mold-inspection"),
  false,
);
assert.equal(
  replaced.application.approval,
  inactiveWorkspace.application.approval,
);
assert.equal(
  replaced.application.membership,
  inactiveWorkspace.application.membership,
);
assert.equal(
  replaced.application.suspended,
  inactiveWorkspace.application.suspended,
);
assert.deepEqual(
  (await rpc(a, "rhh_member_workspace")).application,
  replaced.application,
);
assert.deepEqual(
  (await rpc(b, "rhh_member_workspace")).application.profile.categoryIds,
  ["mold-inspection"],
);
assertions += 8;
// Entire suite runs with the managed Auth schema inaccessible to executors.
assert.deepEqual(
  (await rpc(a, "rhh_member_workspace")).application,
  replaced.application,
);
assertions++;
for (const executor of [
  "rhh_member_writer",
  "rhh_admin_writer",
  "rhh_public_reader",
]) {
  assert.equal(
    (
      await db.query("select has_schema_privilege($1,'auth','usage') allowed", [
        executor,
      ])
    ).rows[0].allowed,
    false,
  );
  assert.equal(
    (
      await db.query(
        "select has_table_privilege($1,'auth.users','select') allowed",
        [executor],
      )
    ).rows[0].allowed,
    false,
  );
  assert.equal(
    (
      await db.query(
        "select has_table_privilege($1,'auth.sessions','select') allowed",
        [executor],
      )
    ).rows[0].allowed,
    false,
  );
  assert.equal(
    (
      await db.query(
        "select has_function_privilege($1,'rhh_private.request_user_id()','execute') allowed",
        [executor],
      )
    ).rows[0].allowed,
    true,
  );
  assertions += 4;
}
await denies(
  () => asMember(a, "select rhh_private.request_user_id()"),
  /permission denied/,
);
if (process.argv.includes("--fingerprint")) {
  console.log(
    (
      await db.query(
        "select md5(string_agg(n.nspname||'.'||p.proname||':'||p.prosecdef::text||':'||p.proowner::regrole::text||':'||md5(replace(p.prosrc,chr(13),'')), '|' order by n.nspname,p.proname)) fingerprint from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rhh_private' or (n.nspname='public' and p.proname like 'rhh_%')",
      )
    ).rows[0],
  );
}
await db.close();
console.log(
  `PASS: ${assertions} member ownership/database checks. Local PostgreSQL-compatible engine with simulated Auth identities; no live Supabase account lifecycle claimed.`,
);
