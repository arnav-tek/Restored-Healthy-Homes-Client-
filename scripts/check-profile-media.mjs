import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { openInquiryTestDatabase, a, b } from "./lib/inquiry-test-database.mjs";
const db = await openInquiryTestDatabase();
await db.exec(
  `create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;alter table storage.objects force row level security;grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;`,
);
await db.exec(
  await readFile(
    new URL(
      "../supabase/migrations/20261113010253_profile_media.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
if (process.argv.includes("--fingerprint")) {
  const result = await db.query(
    "select md5(string_agg(n.nspname||'.'||p.proname||':'||p.prosecdef::text||':'||p.proowner::regrole::text||':'||md5(replace(p.prosrc,chr(13),'')), '|' order by n.nspname,p.proname)) fingerprint from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rhh_private' or (n.nspname='public' and p.proname like 'rhh_%')",
  );
  console.log(result.rows[0].fingerprint);
  await db.close();
  process.exit(0);
}
let checks = 0;
function eq(x, y) {
  assert.deepEqual(x, y);
  checks++;
}
async function as(uid, fn) {
  await db.exec(
    `set role ${uid ? "authenticated" : "anon"};select set_config('request.jwt.claim.sub','${uid ?? ""}',false)`,
  );
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
async function media(
  uid,
  action = "get",
  target = null,
  version = null,
  publish = false,
) {
  return as(
    uid,
    async () =>
      (
        await db.query("select public.rhh_member_media($1,$2,$3,$4) result", [
          action,
          target,
          version,
          publish,
        ])
      ).rows[0].result,
  );
}
async function deny(fn, code) {
  await assert.rejects(fn, { code });
  checks++;
}
const profile = {
  name: "Private media test",
  businessName: "Isolated profile media test",
  email: "fixture@example.invalid",
  phone: "",
  website: "",
  city: "Raleigh",
  state: "NC",
  description: "Isolated profile image integration test only.",
  practices: "Isolated healthy-home test practices only.",
  categoryIds: ["mold-inspection"],
  services: ["Fixture service"],
  listedCredentials: [],
};
const ids = [];
for (const uid of [a, b]) {
  const data = await as(
    uid,
    async () =>
      (
        await db.query("select public.rhh_create_application($1) result", [
          profile,
        ])
      ).rows[0].result,
  );
  ids.push(data.application.id);
}
const [pid] = ids;
eq(await media(a), { version: 1, photoId: null, published: false, drafts: [] });
await deny(() => media(null), "42501");
const upload = await media(a, "reserve");
eq(upload.objectPath, `${pid}/${upload.id}.webp`);
eq((await media(a)).photoId, null);
eq(await media(b, "route", upload.id), null);
await deny(() => media(b, "save", upload.id, 1, true), "PT404");
await deny(() => media(a, "save", upload.id, 1, true), "PT409"); // interrupted upload cannot replace
await db.query(
  "insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)",
  [
    "rhh-profile-images",
    upload.objectPath,
    { mimetype: "image/webp", size: 512 },
  ],
);
let state = await media(a, "save", upload.id, 1, false);
eq(state.photoId, upload.id);
eq(state.published, false);
eq((await media(a)).photoId, upload.id);
eq(state.version, 2);
eq((await media(a, "save", upload.id, 1, false)).version, 2); // retry receipt no extra state
async function publicRoute(id = upload.id) {
  return as(
    null,
    async () =>
      (
        await db.query("select public.rhh_public_profile_media($1,$2) result", [
          pid,
          id,
        ])
      ).rows[0].result,
  );
}
eq(await publicRoute(), null);
state = await media(a, "save", upload.id, 2, true);
eq(await publicRoute(), null); // still ineligible
await db.query(
  "update rhh.applications set approval='approved' where professional_id=$1",
  [pid],
);
await db.query(
  "update rhh.memberships set status='active' where professional_id=$1",
  [pid],
);
eq((await publicRoute()).id, upload.id);
await db.query(
  "update rhh.applications set suspended=true where professional_id=$1",
  [pid],
);
eq(await publicRoute(), null);
await db.query(
  "update rhh.applications set suspended=false where professional_id=$1",
  [pid],
);
await as(null, async () =>
  eq((await db.query("select * from storage.objects")).rows.length, 0),
);
await as(a, async () =>
  eq((await db.query("select * from storage.objects")).rows.length, 0),
);
await deny(
  () =>
    as(a, () =>
      db.query(
        "insert into storage.objects(bucket_id,name) values('rhh-profile-images','forged')",
      ),
    ),
  "42501",
);
await deny(
  () => as(a, () => db.query("select * from rhh_private.profile_media")),
  "42501",
);
const next = await media(a, "reserve");
await deny(() => media(a, "save", next.id, 2, true), "PT409");
eq((await media(a)).photoId, upload.id);
await db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
  "rhh-profile-images",
  next.objectPath,
]);
state = await media(a, "save", next.id, 3, true);
eq(state.version, 4);
eq(await publicRoute(), null);
eq((await publicRoute(next.id)).id, next.id);
await db.query("update rhh.professionals set owner_id=null where id=$1", [pid]);
eq(await publicRoute(next.id), null);
await db.query("update rhh.professionals set owner_id=$1 where id=$2", [
  a,
  pid,
]);
await deny(() => media(a, "cancel", next.id), "PT409");
await deny(() => media(a, "save", null, 3, false), "PT409");
eq((await media(a)).photoId, next.id);
eq(await media(a, "cleanup"), []); // safety grace avoids racing in-flight uploads
await db.query(
  "update rhh_private.profile_media set created_at=clock_timestamp()-interval '11 minutes' where id=$1",
  [upload.id],
);
eq((await media(a, "cleanup"))[0].id, upload.id);
await deny(() => media(a, "ack", upload.id), "PT409");
await db.query("delete from storage.objects where name=$1", [
  upload.objectPath,
]);
await media(a, "ack", upload.id);
eq((await media(a, "cleanup")).length, 0);
state = await media(a, "save", null, 4, false);
eq(state.photoId, null);
eq(await publicRoute(next.id), null);
eq((await media(a)).photoId, null);
const canceled = await media(a, "reserve");
await media(a, "cancel", canceled.id);
await deny(() => media(a, "save", canceled.id, state.version, true), "PT404");
const drafts = [await media(a, "reserve"), await media(a, "reserve")];
await deny(() => media(a, "reserve"), "PT429");
await db.query(
  "update rhh_private.profile_media set created_at=clock_timestamp()-interval '25 hours' where id=any($1::uuid[])",
  [drafts.map((x) => x.id)],
);
eq(
  (await media(a, "cleanup")).filter((x) => drafts.some((d) => d.id === x.id))
    .length,
  2,
);
await db.exec(
  `delete from rhh_private.profile_media;update rhh_private.profile_media_quotas set attempts=20;`,
);
await deny(() => media(a, "reserve"), "PT429");
await db.query("update rhh.accounts set role='admin' where user_id=$1", [a]);
await deny(() => media(a), "42501");
await db.query("update rhh.accounts set role='member' where user_id=$1", [a]);
await db.query("delete from auth.sessions where user_id=$1", [a]);
await deny(() => media(a), "42501");
eq(
  (
    await db.query(
      "select public from storage.buckets where id='rhh-profile-images'",
    )
  ).rows[0].public,
  false,
);
eq(
  (
    await db.query(
      "select count(*)::int n from pg_roles where rolname='rhh_media_writer' and (rolcanlogin or rolbypassrls)",
    )
  ).rows[0].n,
  0,
);
console.log(
  `PASS: ${checks} isolated profile-media SQL checks. Simulated Auth/storage metadata; no real file transfer or hosted account acceptance.`,
);
await db.close();
