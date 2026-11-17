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
await db.exec(
  await readFile(
    new URL(
      "../supabase/migrations/20261114191924_connected_consultations.sql",
      import.meta.url,
    ),
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
if (!process.argv.includes("--before-participation-fix"))
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261114201534_member_consultation_participation.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
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

const payload = {
  requestId: randomUUID(),
  token: "a".repeat(64),
  name: "Test visitor",
  email: "visitor@example.invalid",
  categoryId: "mold-inspection",
  format: "phone",
  topic: "Please explain a healthy home inspection.",
};
const publicRpc = (action, input = payload) =>
  rpc(null, "rhh_consultation_public", [action, input]);
const workspace = (uid, adminView, action = "list", input = {}) =>
  rpc(uid, "rhh_consultation_workspace", [adminView, action, input]);
const receipt = { requestId: payload.requestId, token: payload.token };
eq(await publicRpc("submit"), { saved: true });
eq(await publicRpc("submit"), { saved: true });
eq(
  (await db.query("select count(*)::int n from rhh.consultations")).rows[0].n,
  1,
);
await denied(
  () =>
    publicRpc("submit", {
      ...payload,
      topic: "A changed request should conflict on retry.",
    }),
  "PT409",
);
await denied(
  () =>
    publicRpc("submit", { ...payload, requestId: randomUUID(), ownerId: a }),
  "22023",
);
const missing = { ...payload, requestId: randomUUID() };
delete missing.name;
missing.version = "1";
await denied(() => publicRpc("submit", missing), "22023");
await denied(
  () => publicRpc("status", { ...receipt, token: "b".repeat(64) }),
  "PT404",
);
eq(await publicRpc("status", receipt), {
  status: "requested",
  version: 1,
  categoryId: "mold-inspection",
});
await denied(() => workspace(null, true), "42501");
await denied(() => workspace(a, true), "42501");
await denied(() => workspace(a, null), "22023");
let queue = await workspace(admin, true);
eq(queue.items.length, 1);
eq(queue.items[0].email, payload.email);
eq(queue.candidates.length, 0);
const id = queue.items[0].id;
const change = (uid, adminView, action, version, extra = {}) =>
  workspace(uid, adminView, action, { id, version, ...extra });
await denied(
  () => change(admin, true, "assign", 1, { professionalId: ids[0] }),
  "PT409",
);
await db.exec(
  "update rhh.applications set approval='approved';update rhh.memberships set status='active';update rhh.professionals set free_phone_consultation=true;",
);
queue = await workspace(admin, true);
eq(queue.candidates.length, 2);
eq(await change(admin, true, "assign", 1, { professionalId: ids[0] }), {
  saved: true,
});
eq((await workspace(a, false)).items.length, 1);
eq((await workspace(b, false)).items.length, 0);
const own = (await workspace(a, false)).items[0];
eq("email" in own, false);
eq("name" in own, false);
eq("note" in own, false);
await denied(() => change(b, false, "accept", 2), "42501");
await denied(() => change(a, false, "cancel", 2), "22023");
await denied(() => change(admin, true, "cancel", 1), "PT409");
await db.query(
  "update rhh.professionals set free_phone_consultation=false where id=$1",
  [ids[0]],
);
await denied(() => change(a, false, "accept", 2), "PT409");
eq(await change(a, false, "decline", 2), { saved: true });
eq((await workspace(a, false)).items.length, 0);
eq((await publicRpc("status", receipt)).status, "requested");
await change(admin, true, "assign", 3, { professionalId: ids[1] });
await change(b, false, "accept", 4);
eq((await publicRpc("status", receipt)).status, "accepted");
await denied(() => change(b, false, "decline", 5), "PT409");
await change(admin, true, "note", 5, { note: "Private coordination note" });
eq((await workspace(admin, true)).items[0].note, "Private coordination note");
eq("note" in (await workspace(b, false)).items[0], false);
await denied(() => publicRpc("cancel", { ...receipt, version: 5 }), "PT409");
eq((await publicRpc("cancel", { ...receipt, version: 6 })).status, "cancelled");
await denied(
  () => change(admin, true, "assign", 7, { professionalId: ids[1] }),
  "PT409",
);
await as(a, () =>
  denied(() => db.query("select * from rhh.consultations"), "42501"),
);
await as(admin, () =>
  denied(
    () => db.query("select * from rhh_private.consultation_receipts"),
    "42501",
  ),
);
// New preference contract: current confirmed identity only, no target IDs.
const preference = (uid, payload) =>
  rpc(uid, "rhh_member_consultation_preference", [payload]);
let pref = await preference(a, { action: "get" });
eq(pref.enabled, false);
const initialVersion = pref.version;
eq(
  await preference(a, {
    action: "save",
    enabled: false,
    version: initialVersion,
  }),
  { enabled: false, version: initialVersion + 1 },
);
eq(await preference(a, { action: "get" }), {
  enabled: false,
  version: initialVersion + 1,
});
eq((await preference(b, { action: "get" })).enabled, true);
await denied(() => preference(null, { action: "get" }), "42501");
await denied(() => preference(admin, { action: "get" }), "42501");
for (const key of [
  "ownerId",
  "professionalId",
  "role",
  "approval",
  "membership",
  "suspended",
  "credentials",
])
  await denied(
    () =>
      preference(a, {
        action: "save",
        enabled: true,
        version: initialVersion + 1,
        [key]: b,
      }),
    "22023",
  );
await denied(
  () =>
    preference(a, {
      action: "save",
      enabled: "true",
      version: initialVersion + 1,
    }),
  "22023",
);
await denied(
  () =>
    preference(a, { action: "save", enabled: true, version: initialVersion }),
  "40001",
);
// Preference and ordinary profile edits share the same optimistic version.
await denied(
  () => rpc(a, "rhh_save_profile", [profile, initialVersion]),
  "P0001",
);
await rpc(a, "rhh_save_profile", [profile, initialVersion + 1]);
await denied(
  () =>
    preference(a, {
      action: "save",
      enabled: true,
      version: initialVersion + 1,
    }),
  "40001",
);
pref = await preference(a, { action: "get" });
// A second synthetic request tests opt-out eligibility without deleting history.
const extraPayload = { ...payload, requestId: randomUUID() };
await publicRpc("submit", extraPayload);
let extra = (await workspace(admin, true)).items.find((row) => row.id !== id);
await denied(
  () =>
    workspace(admin, true, "assign", {
      id: extra.id,
      version: 1,
      professionalId: ids[0],
    }),
  "PT409",
);
await preference(a, { action: "save", enabled: true, version: pref.version });
await workspace(admin, true, "assign", {
  id: extra.id,
  version: 1,
  professionalId: ids[0],
});
pref = await preference(a, { action: "get" });
await preference(a, { action: "save", enabled: false, version: pref.version });
await denied(
  () => workspace(a, false, "accept", { id: extra.id, version: 2 }),
  "PT409",
);
eq(await workspace(a, false, "decline", { id: extra.id, version: 2 }), {
  saved: true,
});
eq(
  (await workspace(admin, true)).items.find((row) => row.id === extra.id)
    .status,
  "requested",
);
pref = await preference(a, { action: "get" });
await preference(a, { action: "save", enabled: true, version: pref.version });
await db.query(
  "update rhh.applications set suspended=true where professional_id=$1",
  [ids[0]],
);
await denied(
  () =>
    workspace(admin, true, "assign", {
      id: extra.id,
      version: 3,
      professionalId: ids[0],
    }),
  "PT409",
);
await db.query(
  "update rhh.applications set suspended=false where professional_id=$1",
  [ids[0]],
);
await db.query(
  "update rhh.memberships set status='inactive' where professional_id=$1",
  [ids[0]],
);
await denied(
  () =>
    workspace(admin, true, "assign", {
      id: extra.id,
      version: 3,
      professionalId: ids[0],
    }),
  "PT409",
);
await db.query(
  "update rhh.memberships set status='active' where professional_id=$1",
  [ids[0]],
);
await db.query("update rhh.professionals set owner_id=null where id=$1", [
  ids[0],
]);
await denied(() => preference(a, { action: "get" }), "42501");
await db.query("update rhh.professionals set owner_id=$1 where id=$2", [
  a,
  ids[0],
]);
await db.query("delete from auth.sessions where user_id=$1", [b]);
await denied(() => preference(b, { action: "get" }), "42501");
await denied(() => workspace(b, false), "42501");
for (let i = 0; i < 3; i++)
  await publicRpc("submit", { ...payload, requestId: randomUUID() });
await denied(
  () => publicRpc("submit", { ...payload, requestId: randomUUID() }),
  "PT429",
);
eq(
  (await db.query("select count(*)::int n from rhh.consultations")).rows[0].n,
  5,
);
await db.exec(
  "update rhh_private.consultation_receipts set expires_at=now()-interval '1 day'",
);
await denied(() => publicRpc("status", receipt), "PT404");
// More than one SQL queue page, with disjoint/stable identities and the existing limit.
for (let i = 0; i < 42; i++)
  await publicRpc("submit", {
    ...payload,
    requestId: randomUUID(),
    email: `page-${i}@example.invalid`,
  });
const page1 = await workspace(admin, true, "list", { page: 1 }),
  page2 = await workspace(admin, true, "list", { page: 2 }),
  page3 = await workspace(admin, true, "list", { page: 3 });
eq(page1.items.length, 20);
eq(page2.items.length, 20);
eq(page3.items.length, 7);
eq(page1.hasNext, true);
eq(page3.hasNext, false);
eq(
  page1.items.some((x) => page2.items.some((y) => y.id === x.id)),
  false,
);
eq(
  (await workspace(admin, true, "list", { page: 2 })).items.map((x) => x.id),
  page2.items.map((x) => x.id),
);
console.log(
  `${checks} isolated consultation checks passed (synthetic identities, no hosted writes).`,
);
await db.close();
