import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  openInquiryTestDatabase,
  a,
  b,
  unconfirmed,
} from "./lib/inquiry-test-database.mjs";
const db = await openInquiryTestDatabase();
if (process.argv.includes("--fingerprint")) {
  const result = await db.query(
    "select md5(string_agg(n.nspname||'.'||p.proname||':'||p.prosecdef::text||':'||p.proowner::regrole::text||':'||md5(replace(p.prosrc,chr(13),'')), '|' order by n.nspname,p.proname)) fingerprint from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rhh_private' or (n.nspname='public' and p.proname like 'rhh_%')",
  );
  console.log(result.rows[0].fingerprint);
  await db.close();
  process.exit(0);
}
if (process.argv.includes("--rollback-script")) {
  await db.exec(
    "insert into auth.users(id,email_confirmed_at,email) values('e7ca010b-de06-4e0e-856d-f4ad54d5fcaa',now(),'rollback-member@example.invalid'); insert into rhh.accounts(user_id) values('e7ca010b-de06-4e0e-856d-f4ad54d5fcaa')",
  );
  const results = await db.exec(
    await readFile(
      new URL("../supabase/verify-inquiries.sql", import.meta.url),
      "utf8",
    ),
  );
  const checks = results
    .flatMap((result) => result.rows ?? [])
    .filter((row) => "passed" in row);
  assert.equal(checks.length, 21);
  assert.ok(checks.every((row) => row.passed));
  assert.equal(
    (await db.query("select count(*)::int n from rhh.professionals")).rows[0].n,
    0,
  );
  console.log(
    "Rollback-only inquiry SQL preflight passed: 21 checks; no fixture rows retained. Auth schema fixture, not live account acceptance.",
  );
  await db.close();
  process.exit(0);
}
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
async function denies(fn, message, code) {
  await assert.rejects(fn, code ? { message, code } : message);
  assertions++;
}
const { randomUUID } = await import("node:crypto");
function equal(actual, expected) {
  assert.deepEqual(actual, expected);
  assertions++;
}
const profile = {
  name: "Inquiry test member A",
  businessName: "Isolated inquiry test listing",
  email: "member-a@example.invalid",
  phone: "",
  website: "",
  city: "Raleigh",
  state: "NC",
  description: "Isolated local inquiry test business.",
  practices: "Isolated local healthy-home test practices.",
  categoryIds: ["mold-inspection"],
  services: ["Test-only service"],
  listedCredentials: [],
};
const saved = await rpc(a, "rhh_create_application", [profile]);
await rpc(b, "rhh_member_workspace");
const target = saved.application.id;
await db.query(
  "update rhh.applications set approval='approved' where professional_id=$1",
  [target],
);
await db.query(
  "update rhh.memberships set status='active' where professional_id=$1",
  [target],
);
const payload = (extra = {}) => ({
  professionalId: target,
  requestId: randomUUID(),
  name: "Test-only sender",
  email: "sender@example.invalid",
  message: "Test-only inquiry body, kept as plain text.",
  ...extra,
});
async function anon(name, args = []) {
  await db.exec(
    "set role anon; select set_config('request.jwt.claim.sub','',false)",
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
async function submit(input) {
  return anon("rhh_submit_inquiry", [input]);
}
const input = payload();
equal(await submit(input), { saved: true });
let list = await rpc(a, "rhh_inbox", [1]);
equal(list.items.length, 1);
equal(list.items[0].readAt, null);
const id = list.items[0].id;
const detail = await rpc(a, "rhh_read_inquiry", [id]);
equal(detail.message, input.message);
equal(detail.email, input.email);
equal(detail.professionalId, target);
equal(
  Object.keys(detail).sort(),
  [
    "id",
    "professionalId",
    "name",
    "email",
    "message",
    "createdAt",
    "readAt",
    "version",
  ].sort(),
);
equal(
  Object.keys(list.items[0]).sort(),
  ["id", "name", "createdAt", "readAt"].sort(),
);
equal(await submit(input), { saved: true });
equal((await rpc(a, "rhh_inbox", [1])).items.length, 1);
equal(
  (
    await db.query(
      "select used from rhh_private.inquiry_limits where bucket='global'",
    )
  ).rows[0].used,
  1,
);
await denies(
  () =>
    submit({
      ...input,
      message: "Different content must use a new request ID.",
    }),
  /inquiry_request_changed/,
);
for (const key of [
  "ownerId",
  "recipientId",
  "recipientEmail",
  "role",
  "approval",
  "readAt",
  "createdAt",
  "internalNotes",
])
  await denies(() => submit({ ...payload(), [key]: b }), /invalid_inquiry/);
for (const body of [
  null,
  [],
  {},
  payload({ message: 1 }),
  payload({ message: "short" }),
  payload({ message: "\n".repeat(10) }),
  payload({ name: "\t" }),
  payload({ name: "x".repeat(81) }),
  payload({ message: "x".repeat(2001) }),
  payload({ email: "invalid" }),
  payload({ requestId: "invalid" }),
  payload({ message: "x".repeat(17000) }),
])
  await denies(() => submit(body), /invalid_inquiry/);
await denies(
  () => submit(payload({ professionalId: randomUUID() })),
  /inquiry_unavailable/,
  "PT404",
);
await db.query(
  "update rhh.applications set suspended=true where professional_id=$1",
  [target],
);
await denies(() => submit(payload()), /inquiry_unavailable/);
// A committed retry is acknowledged even if the listing subsequently became unavailable.
equal(await submit(input), { saved: true });
await db.query(
  "update rhh.applications set suspended=false,approval='pending' where professional_id=$1",
  [target],
);
await denies(() => submit(payload()), /inquiry_unavailable/);
await db.query(
  "update rhh.applications set approval='approved' where professional_id=$1",
  [target],
);
await db.query(
  "update rhh.memberships set status='inactive' where professional_id=$1",
  [target],
);
await denies(() => submit(payload()), /inquiry_unavailable/);
await db.query(
  "update rhh.memberships set status='active' where professional_id=$1",
  [target],
);
await db.query("update auth.users set email_confirmed_at=null where id=$1", [
  a,
]);
await denies(() => submit(payload()), /inquiry_unavailable/);
await db.query("update auth.users set email_confirmed_at=now() where id=$1", [
  a,
]);
for (const [name, args] of [
  ["rhh_inbox", [1]],
  ["rhh_read_inquiry", [id]],
  ["rhh_set_inquiry_read", [id, true, 1]],
])
  await denies(() => anon(name, args), /permission denied/);
equal((await rpc(b, "rhh_inbox", [1])).items, []);
equal(await rpc(b, "rhh_read_inquiry", [id]), null);
await denies(
  () => rpc(b, "rhh_set_inquiry_read", [id, true, 1]),
  /inquiry_unavailable/,
);
equal(await rpc(a, "rhh_read_inquiry", [randomUUID()]), null);
let changed = await rpc(a, "rhh_set_inquiry_read", [id, true, 1]);
equal(changed.version, 2);
equal(typeof changed.readAt, "string");
equal((await rpc(a, "rhh_read_inquiry", [id])).readAt, changed.readAt);
await denies(
  () => rpc(a, "rhh_set_inquiry_read", [id, false, 1]),
  /inquiry_state_conflict/,
  "PT409",
);
changed = await rpc(a, "rhh_set_inquiry_read", [id, false, 2]);
equal(changed.readAt, null);
equal(changed.version, 3);
for (const query of [
  "select * from rhh.inquiries",
  "update rhh.inquiries set message='forged'",
  "update rhh.inquiries set recipient_id='" + b + "'",
  "select rhh_private.inquiry_recipient('" + target + "')",
])
  await denies(() => asMember(a, query), /permission denied/);
equal(
  (
    await db.query(
      "select pg_has_role('authenticated','rhh_inquiry_writer','member') allowed",
    )
  ).rows[0].allowed,
  false,
);
await db.query("update rhh.professionals set owner_id=$1 where id=$2", [
  b,
  target,
]);
equal((await rpc(a, "rhh_read_inquiry", [id])).email, input.email);
equal(await rpc(b, "rhh_read_inquiry", [id]), null);
const transferred = payload({ email: "new-owner-sender@example.invalid" });
await submit(transferred);
equal((await rpc(b, "rhh_inbox", [1])).items.length, 1);
equal((await rpc(a, "rhh_inbox", [1])).items.length, 1);
await db.query("update rhh.professionals set owner_id=$1 where id=$2", [
  a,
  target,
]);
const admin = "00000000-0000-4000-8000-000000000004";
await db.query(
  "insert into auth.users(id,email_confirmed_at) values($1,now());",
  [admin],
);
await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [admin]);
await db.query("insert into rhh.accounts(user_id,role) values($1,'admin')", [
  admin,
]);
await denies(
  () => rpc(admin, "rhh_read_inquiry", [id]),
  /member_access_required/,
);
await denies(() => rpc(admin, "rhh_inbox", [1]), /member_access_required/);
await denies(
  () => rpc(unconfirmed, "rhh_inbox", [1]),
  /confirmed_identity_required/,
);
await db.query("delete from auth.sessions where user_id=$1", [a]);
await denies(() => rpc(a, "rhh_inbox", [1]), /confirmed_identity_required/);
await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [a]);
// Duplicate requests submitted together: PGlite queues statements, not multi-connection concurrency.
await db.exec(
  "set role anon; select set_config('request.jwt.claim.sub','',false)",
);
const simultaneous = payload({ email: "duplicate@example.invalid" });
await Promise.all(
  Array.from({ length: 6 }, () =>
    db.query("select public.rhh_submit_inquiry($1)", [simultaneous]),
  ),
);
await db.exec("reset role");
equal(
  (
    await db.query(
      "select count(*)::int n from rhh.inquiries where sender_email='duplicate@example.invalid'",
    )
  ).rows[0].n,
  1,
);
await db.exec("delete from rhh_private.inquiry_limits");
for (let n = 0; n < 3; n++)
  await submit(payload({ email: "rate@example.invalid" }));
await denies(
  () => submit(payload({ email: "RATE@example.invalid" })),
  /inquiry_rate_limited/,
  "PT429",
);
equal(
  (
    await db.query(
      "select count(*)::int n from rhh.inquiries where lower(sender_email)='rate@example.invalid'",
    )
  ).rows[0].n,
  3,
);
await db.exec("delete from rhh_private.inquiry_limits");
for (let n = 0; n < 20; n++)
  await submit(payload({ email: `target-rate-${n}@example.invalid` }));
await denies(
  () => submit(payload({ email: "target-rate-overflow@example.invalid" })),
  /inquiry_rate_limited/,
  "PT429",
);
equal(
  (
    await db.query(
      "select used from rhh_private.inquiry_limits where bucket='global'",
    )
  ).rows[0].used,
  20,
);
await db.exec(
  "delete from rhh_private.inquiry_limits; insert into rhh_private.inquiry_limits values('global',to_timestamp(floor(extract(epoch from clock_timestamp())/3600)*3600),clock_timestamp()+interval '1 hour',100)",
);
await denies(
  () => submit(payload({ email: "global-rate@example.invalid" })),
  /inquiry_rate_limited/,
  "PT429",
);
await db.exec(
  "delete from rhh_private.inquiry_limits; insert into rhh_private.inquiry_limits values('expired',now()-interval '1 day',now()-interval '1 hour',1)",
);
await submit(payload({ email: "cleanup@example.invalid" }));
equal(
  (
    await db.query(
      "select count(*)::int n from rhh_private.inquiry_limits where bucket='expired'",
    )
  ).rows[0].n,
  0,
);
// A failure after quota reservation must roll back the message, quota and retry receipt.
await db.exec(
  "delete from rhh_private.inquiry_limits; alter table rhh.inquiries add constraint test_save_failure check(sender_name<>'Forced local failure')",
);
const failedInput = payload({
  name: "Forced local failure",
  email: "failed-save@example.invalid",
});
await denies(() => submit(failedInput), /test_save_failure/);
equal(
  (await db.query("select count(*)::int n from rhh_private.inquiry_limits"))
    .rows[0].n,
  0,
);
equal(
  (
    await db.query(
      "select count(*)::int n from rhh_private.inquiry_requests where request_id=$1",
      [failedInput.requestId],
    )
  ).rows[0].n,
  0,
);
await db.exec("alter table rhh.inquiries drop constraint test_save_failure");
equal(await submit(failedInput), { saved: true });
for (const role of [
  "anon",
  "authenticated",
  "rhh_admin_writer",
  "rhh_public_reader",
  "rhh_inquiry_writer",
]) {
  equal(
    (
      await db.query(
        "select has_table_privilege($1,'rhh.inquiries','select') allowed",
        [role],
      )
    ).rows[0].allowed,
    false,
  );
}
equal(
  (
    await db.query(
      "select has_column_privilege('rhh_inquiry_writer','rhh.accounts','role','update') allowed",
    )
  ).rows[0].allowed,
  false,
);
equal(
  (
    await db.query(
      "select has_column_privilege('rhh_member_writer','rhh.inquiries','message','update') allowed",
    )
  ).rows[0].allowed,
  false,
);
equal(
  (
    await db.query(
      "select has_function_privilege('anon','rhh_private.inquiry_recipient(uuid)','execute') allowed",
    )
  ).rows[0].allowed,
  false,
);
equal(
  (
    await db.query(
      "select count(*)::int n from pg_roles where rolname='rhh_inquiry_writer' and (rolcanlogin or rolbypassrls)",
    )
  ).rows[0].n,
  0,
);
const publicOutput = JSON.stringify(await anon("rhh_public_directory"));
for (const privateValue of [
  input.email,
  input.message,
  "recipient_id",
  "sender_email",
  "readAt",
  "inquiries",
]) {
  equal(publicOutput.includes(privateValue), false);
}
// Pagination and persistence; inbox list deliberately excludes sender addresses/messages.
list = await rpc(a, "rhh_inbox", [1]);
equal(list.items.length, 20);
equal(list.hasNext, true);
const second = await rpc(a, "rhh_inbox", [2]);
equal(second.items.length > 0, true);
equal(
  second.items.some((x) => list.items.some((y) => y.id === x.id)),
  false,
);
await denies(() => rpc(a, "rhh_inbox", [0]), /invalid_inbox_page/);
equal((await rpc(a, "rhh_inbox", [9999])).items, []);
console.log(
  `Inquiry database checks passed: ${assertions} (isolated SQL roles; Auth schema fixture; queued, not multi-connection concurrency).`,
);
await db.close();
