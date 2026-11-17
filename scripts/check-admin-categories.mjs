import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { openInquiryTestDatabase, a, b } from "./lib/inquiry-test-database.mjs";
const db = await openInquiryTestDatabase();
await db.exec(
  "create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);",
);
for (const name of [
  "20261113010253_profile_media.sql",
  "20261113024706_connected_qa.sql",
  "20261113073823_credential_evidence_and_reviews.sql",
  "20261113082223_connected_qa_moderation.sql",
  "20261113083217_qa_moderation_queue_order.sql",
  "20261113090302_connected_reviews_and_ratings.sql",
  "20261113092925_preserve_published_review_note_edits.sql",
  "20261114191924_connected_consultations.sql",
  "20261114201534_member_consultation_participation.sql",
  "20261115210226_admin_category_management.sql",
])
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/" + name, import.meta.url),
      "utf8",
    ),
  );
const admin = "00000000-0000-4000-8000-000000000004";
await db.query(
  "insert into auth.users(id,email_confirmed_at) values($1,now());",
  [admin],
);
await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [admin]);
await db.query("insert into rhh.accounts(user_id,role) values($1,'admin')", [
  admin,
]);
let checks = 0;
const eq = (x, y) => {
  assert.deepEqual(x, y);
  checks++;
};
const denied = async (fn, code) => {
  await assert.rejects(fn, code ? { code } : undefined);
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
async function rpc(uid, name, payload) {
  return as(
    uid,
    async () =>
      (
        await db.query(`select public.${name}($1::jsonb) r`, [
          JSON.stringify(payload),
        ])
      ).rows[0].r,
  );
}
const get = () => rpc(admin, "rhh_admin_categories", { action: "get" });
const original = (
  await db.query(
    "select id,name,monthly_usd,billing_key,active from rhh.categories order by id",
  )
).rows;
eq(original.length, 8);
eq(
  original.map((c) => c.monthly_usd).sort((x, y) => x - y),
  [79, 79, 129, 129, 129, 129, 129, 200],
);
let saved = await get();
eq(saved.version, 1);
eq(saved.history, []);
for (const uid of [null, a, b]) {
  await denied(
    () => rpc(uid, "rhh_admin_categories", { action: "get" }),
    "42501",
  );
  await denied(
    () =>
      rpc(uid, "rhh_admin_categories", {
        action: "rename",
        id: "mold-inspection",
        name: "Forged member label",
        reason: "Forbidden fixture",
        version: 1,
      }),
    "42501",
  );
}
const creation = {
  action: "create",
  id: "test-specialty",
  name: "Isolated Test Specialty",
  description: "Explicit isolated category configuration only.",
  monthlyUsd: 123,
  billingKey: "membership-test-specialty",
  reason: "Isolated creation test",
  version: 1,
};
for (const patch of [
  { name: " " },
  { name: "x".repeat(81) },
  { name: "Test\u200bCategory" },
  { name: "Test\u{E0001}Category" },
  { name: "Test" + "😀".repeat(40) },
  { name: "<script>" },
  { monthlyUsd: 0 },
  { monthlyUsd: 1.5 },
  { billingKey: "" },
  { description: "short" },
  { id: "UPPER" },
  { ownerId: a },
  { role: "admin" },
  { active: false },
  { actorId: admin },
])
  await denied(
    () => rpc(admin, "rhh_admin_categories", { ...creation, ...patch }),
    "22023",
  );
saved = await rpc(admin, "rhh_admin_categories", creation);
eq(saved.version, 2);
eq(saved.items.length, 9);
eq(saved.history[0].actorId, admin);
eq(saved.history[0].action, "create");
await denied(
  () =>
    rpc(admin, "rhh_admin_categories", {
      ...creation,
      id: "another-test",
      billingKey: "another-key",
      version: 2,
    }),
  "PT409",
);
await denied(
  () =>
    rpc(admin, "rhh_admin_categories", {
      ...creation,
      id: "another-test",
      name: "Other test specialty",
      version: 2,
    }),
  "PT409",
);
const profile = {
  name: "Category fixture",
  businessName: "Isolated category listing",
  email: "fixture@example.invalid",
  phone: "",
  website: "",
  city: "Raleigh",
  state: "NC",
  description: "Synthetic category relationship fixture only.",
  practices: "Isolated test practices only.",
  categoryIds: ["mold-inspection"],
  services: ["Test service"],
  listedCredentials: [],
};
const app = await rpc(a, "rhh_create_application", profile),
  pid = app.application.id;
await db.query(
  "insert into rhh.questions(category_id,title,body,status) values('mold-inspection','Isolated category question','Synthetic question for category relationship checks.','published')",
);
await db.query(
  "insert into rhh.consultations(category_id,contact_name,contact_email,topic,format) values('mold-inspection','Synthetic visitor','fixture@example.invalid','Synthetic consultation relationship only.','phone')",
);
const relatedBefore = (
  await db.query(
    "select p.id,p.owner_id,p.profile_version,a.approval,a.suspended,m.status,m.featured_entitlement from rhh.professionals p join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id where p.id=$1",
    [pid],
  )
).rows[0];
const rename = {
  action: "rename",
  id: "mold-inspection",
  name: "Inspection Specialty Renamed",
  reason: "Explicit isolated rename",
  version: 2,
};
for (const patch of [
  { monthlyUsd: 1 },
  { billingKey: "changed" },
  { active: false },
  { description: "Changed description" },
  { role: "admin" },
  { approval: "approved" },
])
  await denied(
    () => rpc(admin, "rhh_admin_categories", { ...rename, ...patch }),
    "22023",
  );
saved = await rpc(admin, "rhh_admin_categories", rename);
eq(saved.version, 3);
eq(saved.history.length, 2);
eq(saved.history[0].previousName, "Mold Testing / Inspectors");
await denied(
  () =>
    rpc(admin, "rhh_admin_categories", {
      ...rename,
      name: "Competing stale name",
    }),
  "PT409",
);
eq(
  (
    await db.query(
      "select p.id,p.owner_id,p.profile_version,a.approval,a.suspended,m.status,m.featured_entitlement from rhh.professionals p join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id where p.id=$1",
      [pid],
    )
  ).rows[0],
  relatedBefore,
);
eq(
  (
    await db.query(
      "select category_id from rhh.professional_categories where professional_id=$1",
      [pid],
    )
  ).rows[0].category_id,
  "mold-inspection",
);
eq(
  (await db.query("select category_id from rhh.questions")).rows[0].category_id,
  "mold-inspection",
);
eq(
  (await db.query("select category_id from rhh.consultations")).rows[0]
    .category_id,
  "mold-inspection",
);
for (const c of original) {
  const current = (
    await db.query(
      "select id,monthly_usd,billing_key,active from rhh.categories where id=$1",
      [c.id],
    )
  ).rows[0];
  const { name, ...before } = c;
  void name;
  eq(current, before);
}
const member = await as(
  a,
  async () =>
    (await db.query("select public.rhh_member_workspace() r")).rows[0].r,
);
eq(member.catalog.find((c) => c.id === "mold-inspection").name, rename.name);
const pub = await as(
  null,
  async () =>
    (await db.query("select public.rhh_public_categories() r")).rows[0].r,
);
eq(pub.find((c) => c.id === "mold-inspection").name, rename.name);
assert.doesNotMatch(
  JSON.stringify(pub),
  /billingKey|actorId|reason|category_changes/,
);
checks++;
const qa = await as(
  null,
  async () => (await db.query("select public.rhh_public_qa(null) r")).rows[0].r,
);
eq(qa.catalog.find((c) => c.id === "mold-inspection").name, rename.name);
const consultation = await as(
  admin,
  async () =>
    (
      await db.query(
        "select public.rhh_consultation_workspace(true,'list','{}') r",
      )
    ).rows[0].r,
);
eq(consultation.items[0].categoryName, rename.name);
const unchanged = await rpc(admin, "rhh_admin_categories", {
  ...rename,
  version: 3,
});
eq(unchanged.unchanged, true);
eq(unchanged.version, 3);
eq(unchanged.history.length, 2);
await denied(
  () =>
    db.exec(
      "update rhh.categories set monthly_usd=1 where id='mold-inspection'",
    ),
  "42501",
);
await denied(
  () =>
    db.exec(
      "update rhh.categories set billing_key='changed' where id='mold-inspection'",
    ),
  "42501",
);
await denied(
  () => db.exec("delete from rhh.categories where id='test-specialty'"),
  "42501",
);
await denied(
  () => db.exec("update rhh_private.category_changes set reason='Tampered'"),
  "42501",
);
await denied(
  () => db.exec("delete from rhh_private.category_changes"),
  "42501",
);
await as(a, () =>
  denied(() => db.exec("select * from rhh_private.category_changes"), "42501"),
);
await db.query("update rhh.accounts set role='member' where user_id=$1", [
  admin,
]);
await denied(() => get(), "42501");
await db.query("update rhh.accounts set role='admin' where user_id=$1", [
  admin,
]);
await db.query("delete from auth.sessions where user_id=$1", [admin]);
await denied(() => get(), "42501");
console.log(
  `PASS: ${checks} isolated category SQL assertions; synthetic identities/data, not hosted authenticated acceptance. Sequential competing saves verify CAS; simultaneous hosted transactions remain unverified.`,
);
await db.close();
