import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { openInquiryTestDatabase, a, b } from "./lib/inquiry-test-database.mjs";
const db = await openInquiryTestDatabase();
await db.exec(
  `create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);`,
);
for (const name of [
  "20261113010253_profile_media.sql",
  "20261113024706_connected_qa.sql",
  "20261113073823_credential_evidence_and_reviews.sql",
  "20261113082223_connected_qa_moderation.sql",
  "20261113083217_qa_moderation_queue_order.sql",
  "20261113090302_connected_reviews_and_ratings.sql",
  "20261113092925_preserve_published_review_note_edits.sql",
])
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/" + name, import.meta.url),
      "utf8",
    ),
  );
if (process.argv.includes("--fingerprint")) {
  const r = await db.query(
    "select md5(string_agg(n.nspname||'.'||p.proname||':'||p.prosecdef::text||':'||p.proowner::regrole::text||':'||md5(replace(p.prosrc,chr(13),'')), '|' order by n.nspname,p.proname)) fingerprint from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rhh_private' or (n.nspname='public' and p.proname like 'rhh_%')",
  );
  console.log(r.rows[0].fingerprint);
  await db.close();
  process.exit(0);
}
let checks = 0;
const eq = (x, y) => {
  assert.deepEqual(x, y);
  checks++;
};
const denied = async (fn, code) => {
  await assert.rejects(fn, { code });
  checks++;
};
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
async function rpc(uid, name, args = []) {
  return as(
    uid,
    async () =>
      (
        await db.query(
          `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) result`,
          args,
        )
      ).rows[0].result,
  );
}
const profile = {
  name: "QA local test",
  businessName: "QA isolated listing",
  email: "fixture@example.invalid",
  phone: "",
  website: "",
  city: "Raleigh",
  state: "NC",
  description: "Isolated Q&A integration fixture only.",
  practices: "Local healthy-home test practices only.",
  categoryIds: ["mold-inspection"],
  services: ["Fixture"],
  listedCredentials: [],
};
const ids = [];
for (const uid of [a, b]) {
  ids.push(
    (await rpc(uid, "rhh_create_application", [profile])).application.id,
  );
}
await db.query(
  "update auth.users set email=case when id=$1 then 'qa-a@example.invalid' else 'qa-b@example.invalid' end where id=any($2::uuid[])",
  [a, [a, b]],
);

const admin = "00000000-0000-4000-8000-000000000004";
await db.query(
  "insert into auth.users(id,email_confirmed_at,email) values($1,now(),'admin@example.invalid')",
  [admin],
);
await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [admin]);
await db.query("insert into rhh.accounts(user_id,role) values($1,'admin')", [
  admin,
]);

const fields = {
  requestId: randomUUID(),
  displayName: "Local reviewer",
  rating: 4,
  body: "Local service review used only by isolated tests.",
};
const submit = (pid, input = fields) =>
  rpc(null, "rhh_submit_review", [pid, input]);
const load = (uid = admin, filters = {}) =>
  rpc(uid, "rhh_admin_reviews", [filters]);
const detail = async (id) => (await load(admin, { id })).detail;
async function decide(id, action, changes = {}) {
  const d = await detail(id);
  return rpc(admin, "rhh_moderate_review", [
    {
      id,
      version: d.version,
      action,
      reason: "Local review moderation reason",
      note: "PRIVATE NOTE",
      ...changes,
    },
  ]);
}
const pub = async () => (await rpc(null, "rhh_public_directory")).reviews;
const count = async (table) =>
  (await db.query("select count(*)::int n from " + table)).rows[0].n;
await denied(() => submit(ids[0]), "PT404");
eq(await count("rhh.reviews"), 0);
eq(await count("rhh_private.review_events"), 0);
await db.exec(
  "update rhh.applications set approval='approved';update rhh.memberships set status='active'",
);
eq(await submit(ids[0]), { saved: true });
eq(await submit(ids[0]), { saved: true });
eq(await count("rhh.reviews"), 1);
eq(await count("rhh_private.review_events"), 1);
eq(await pub(), []);
await denied(() => submit(ids[0], { ...fields, rating: 2 }), "PT409");
await submit(ids[0], { ...fields, requestId: randomUUID() });
eq(await count("rhh.reviews"), 1);
eq(await count("rhh_private.review_events"), 1);
for (const k of [
  "status",
  "professionalId",
  "ownerId",
  "moderationNote",
  "contactEmail",
  "verifiedCustomer",
])
  await denied(
    () => submit(ids[0], { ...fields, requestId: randomUUID(), [k]: "forged" }),
    "22023",
  );
for (const score of [0, 6, 1.5, "5"])
  await denied(
    () => submit(ids[0], { ...fields, requestId: randomUUID(), rating: score }),
    "22023",
  );
await submit(ids[1], { ...fields, requestId: randomUUID(), rating: 2 });
eq(await count("rhh.reviews"), 2);
const ra = (
    await db.query("select id from rhh.reviews where professional_id=$1", [
      ids[0],
    ])
  ).rows[0].id,
  rb = (
    await db.query("select id from rhh.reviews where professional_id=$1", [
      ids[1],
    ])
  ).rows[0].id;
await db.query(
  "update rhh.reviews set contact_email='PRIVATE@example.invalid' where id=$1",
  [ra],
);
await denied(() => load(null), "42501");
await denied(() => load(a), "42501");
await denied(
  () =>
    rpc(a, "rhh_moderate_review", [
      {
        id: ra,
        version: 1,
        action: "publish",
        reason: "Forged member review",
        note: "",
      },
    ]),
  "42501",
);
await denied(() => as(a, () => db.query("select * from rhh.reviews")), "42501");
await denied(
  () => as(a, () => db.query("update rhh.reviews set rating=5")),
  "42501",
);
eq((await rpc(a, "rhh_member_reviews")).reviews, []);
let d = await detail(ra);
eq(JSON.stringify(d).includes("PRIVATE@example.invalid"), false);
await denied(() => decide(ra, "publish", { actorId: a }), "22023");
await decide(ra, "publish");
eq((await pub()).length, 1);
eq((await pub())[0].rating, 4);
const notePublicationAt = (await pub())[0].publishedAt,
  noteEvents = await count("rhh_private.review_events");
await decide(ra, "publish", { note: "PRIVATE NOTE UPDATED" });
eq((await pub())[0].publishedAt, notePublicationAt);
eq(await count("rhh_private.review_events"), noteEvents);
const unchanged = await decide(ra, "publish", { note: "PRIVATE NOTE UPDATED" });
eq(unchanged.unchanged, true);

eq(JSON.stringify(await pub()).includes("PRIVATE"), false);
eq((await rpc(a, "rhh_member_reviews")).reviews.length, 1);
eq((await rpc(b, "rhh_member_reviews")).reviews, []);
await decide(rb, "publish");
eq((await pub()).length, 2);
eq((await rpc(a, "rhh_member_reviews")).reviews.length, 1);
d = await detail(ra);
const firstAt = (await pub()).find((x) => x.id === ra).publishedAt;
await denied(() => decide(ra, "hide", { version: d.version - 1 }), "PT409");
await decide(ra, "hide");
eq(
  (await pub()).some((x) => x.id === ra),
  false,
);
eq((await rpc(a, "rhh_member_reviews")).reviews, []);
await decide(ra, "restore");
eq(
  (await pub()).some((x) => x.id === ra),
  false,
);
await decide(ra, "publish");
eq((await pub()).find((x) => x.id === ra).publishedAt >= firstAt, true);
eq((await pub()).filter((x) => x.id === ra).length, 1);
const events = await count("rhh_private.review_events");
d = await detail(ra);
await denied(() => decide(ra, "publish", { version: d.version - 1 }), "PT409");
eq(await count("rhh_private.review_events"), events);
await db.query(
  "update rhh.applications set suspended=true where professional_id=$1",
  [ids[0]],
);
eq(
  (await pub()).some((x) => x.professionalId === ids[0]),
  false,
);
await denied(
  () => submit(ids[0], { ...fields, requestId: randomUUID() }),
  "PT404",
);
await decide(ra, "publish", { note: "PRIVATE note while listing suspended" });
eq(
  (await pub()).some((x) => x.professionalId === ids[0]),
  false,
);
await decide(ra, "hide");
await decide(ra, "restore");
await denied(() => decide(ra, "publish"), "PT404");
await db.query(
  "update rhh.applications set suspended=false where professional_id=$1",
  [ids[0]],
);
await decide(ra, "publish");
d = await detail(ra);
await db.query(
  "update rhh.reviews set rating=1,body='Changed reviewed text must return to pending moderation.' where id=$1",
  [ra],
);
eq((await detail(ra)).status, "pending");
eq(
  (await pub()).some((x) => x.id === ra),
  false,
);
eq(await count("rhh_private.review_revisions"), 1);
await denied(() => decide(ra, "publish", { version: d.version }), "PT409");
await decide(ra, "reject");
eq(
  (await detail(ra)).history.some((x) => x.action === "reject"),
  true,
);
eq(
  JSON.stringify(await rpc(a, "rhh_member_reviews")).includes("PRIVATE"),
  false,
);
await decide(rb, "hide");
eq(await pub(), []);
eq((await rpc(b, "rhh_member_reviews")).reviews, []);
await denied(
  () => as(a, () => db.query("select * from rhh_private.review_decisions")),
  "42501",
);
await denied(
  () => as(a, () => db.query("select * from rhh_private.review_events")),
  "42501",
);
eq(
  (
    await db.query(
      "select bool_and(state in ('pending_configuration','canceled')) good from rhh_private.review_events",
    )
  ).rows[0].good,
  true,
);
// Listing limit includes normalized duplicates with new request keys; exact retry does not.
await db.exec("delete from rhh_private.review_limits");
for (let n = 0; n < 20; n++)
  await submit(ids[0], {
    ...fields,
    requestId: randomUUID(),
    body: "Bounded duplicate-protection test review number " + n,
  });
await denied(
  () =>
    submit(ids[0], {
      ...fields,
      requestId: randomUUID(),
      body: "The twenty-first new test receipt must be rate limited.",
    }),
  "PT429",
);
const all = await load(admin, { status: "all" });
eq(all.items.length, 20);
eq(all.hasNext, true);
eq((await load(admin, { status: "all", page: 2 })).items.length, 2);
eq((await load(admin, { professional: ids[1], status: "all" })).total, 1);
await db.query("update rhh.accounts set role='member' where user_id=$1", [
  admin,
]);
await denied(() => load(), "42501");
await denied(
  () =>
    rpc(admin, "rhh_moderate_review", [
      {
        id: ra,
        version: 1,
        action: "publish",
        reason: "Stale administrator role",
        note: "",
      },
    ]),
  "42501",
);
await db.query("update rhh.accounts set role='admin' where user_id=$1", [
  admin,
]);
await db.query("delete from auth.sessions where user_id=$1", [admin]);
await denied(() => load(), "42501");
console.log(
  `PASS: ${checks} isolated review SQL assertions; synthetic Auth A/B/admin, not live JWT or overlapping moderation acceptance.`,
);
await db.close();
