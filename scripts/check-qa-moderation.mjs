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
const question = {
  requestId: randomUUID(),
  title: "Moderation fixture question",
  body: "Isolated pending question content for moderation checks.",
  categoryId: "mold-inspection",
};
await rpc(null, "rhh_submit_question", [question]);
const q = (await db.query("select id from rhh.questions")).rows[0].id;
const load = (uid = admin, filters = {}) => rpc(uid, "rhh_admin_qa", [filters]);
const detail = async (kind, id) =>
  (
    await load(admin, {
      queue: kind === "question" ? "questions" : "answers",
      id,
    })
  ).detail;
async function decide(kind, id, action, changes = {}) {
  const d = await detail(kind, id);
  return rpc(admin, "rhh_moderate_qa", [
    {
      kind,
      id,
      version: d.version,
      parentVersion: kind === "answer" ? d.parentVersion : null,
      action,
      reason: "Local moderation test reason",
      note: "PRIVATE NOTE",
      ...changes,
    },
  ]);
}
await denied(() => load(null), "42501");
await denied(() => load(a), "42501");
await denied(
  () =>
    rpc(a, "rhh_moderate_qa", [
      {
        kind: "question",
        id: q,
        version: 1,
        parentVersion: null,
        action: "publish",
        reason: "Forged user action",
        note: "",
      },
    ]),
  "42501",
);
eq((await load()).total, 1);
eq((await load(admin, { q: "nonexistent" })).total, 0);
eq((await load(admin, { category: "healthy-builders" })).total, 0);
eq((await rpc(null, "rhh_public_qa", [q])).questions, []);
await denied(
  () => decide("question", q, "publish", { reviewer: admin }),
  "22023",
);
eq((await decide("question", q, "publish")).status, "published");
eq((await detail("question", q)).history.length, 1);
eq(
  JSON.stringify(await rpc(null, "rhh_public_qa", [q])).includes("PRIVATE"),
  false,
);
await db.query("update rhh.applications set approval='approved'");
await db.query("update rhh.memberships set status='active'");
// Category alerts are generated only for the recipients eligible at publication.
await decide("question", q, "hide");
eq((await rpc(null, "rhh_public_qa", [q])).questions, []);
await decide("question", q, "restore");
eq((await detail("question", q)).status, "pending");
await decide("question", q, "publish");
eq(
  (
    await db.query(
      "select count(*)::int n from rhh_private.category_alert_events",
    )
  ).rows[0].n,
  2,
);
const submit = (uid, body, version) =>
  rpc(uid, "rhh_submit_answer", [
    { questionId: q, body, ...(version === undefined ? {} : { version }) },
  ]);
await submit(a, "First eligible answer from local member A.");
await submit(b, "Second eligible answer from local member B.");
const answers = (
    await db.query("select id from rhh.answers order by queue_position")
  ).rows.map((x) => x.id),
  [aa, bb] = answers;
eq((await detail("answer", aa)).canPublish, true);
eq((await detail("answer", bb)).canPublish, false);
await denied(() => decide("answer", bb, "publish"), "PT409");
const stale = await detail("answer", aa),
  parentStale = await detail("question", q);
await submit(
  a,
  "Changed pending answer from local member A; new review needed.",
  1,
);
eq(
  (await load(admin, { queue: "answers", status: "pending" })).items[0].id,
  bb,
);
await denied(
  () =>
    decide("answer", aa, "publish", {
      version: stale.version,
      parentVersion: stale.parentVersion,
    }),
  "PT409",
);
await denied(
  () => decide("question", q, "hide", { version: parentStale.version }),
  "PT409",
);
eq((await detail("answer", bb)).canPublish, true);
await decide("answer", bb, "publish");
eq((await rpc(null, "rhh_public_qa", [q])).questions[0].answers[0].id, bb);
eq((await rpc(b, "rhh_member_qa", [q, 1])).answers[0].status, "published");
await denied(
  () => submit(b, "A changed reviewed answer must never bypass moderation.", 2),
  "PT409",
);
await denied(() => decide("answer", aa, "publish"), "PT409");
const reviewed = await detail("answer", bb);
await denied(
  () => decide("answer", bb, "hide", { version: reviewed.version - 1 }),
  "PT409",
);
await decide("question", q, "hide");
eq((await rpc(null, "rhh_public_qa", [q])).questions, []);
eq((await rpc(b, "rhh_member_qa", [q, 1])).answers[0].parentStatus, "hidden");
eq((await rpc(b, "rhh_member_qa", [q, 1])).question, null);
eq(
  JSON.stringify(await rpc(b, "rhh_member_qa", [q, 1])).includes("PRIVATE"),
  false,
);
await decide("question", q, "restore");
eq((await rpc(null, "rhh_public_qa", [q])).questions, []);
await decide("question", q, "publish");
eq((await rpc(null, "rhh_public_qa", [q])).questions[0].answers.length, 1);
await decide("answer", bb, "hide");
eq((await rpc(null, "rhh_public_qa", [q])).questions[0].answers, []);
await decide("answer", aa, "reject");
await decide("answer", bb, "restore");
eq((await detail("answer", bb)).status, "pending");
await decide("answer", bb, "publish");
await db.query(
  "update rhh.applications set suspended=true where professional_id=$1",
  [ids[1]],
);
eq(
  (await rpc(null, "rhh_public_qa", [q])).questions[0].answers[0].profileHref,
  undefined,
);
await decide("answer", bb, "hide");
await decide("answer", bb, "restore");
await denied(() => decide("answer", bb, "publish"), "PT409");
await db.query(
  "update rhh.applications set suspended=false where professional_id=$1",
  [ids[1]],
);
await decide("answer", bb, "reject");
const eventCount = (
  await db.query("select count(*)::int n from rhh_private.qa_moderation_events")
).rows[0].n;
const last = await detail("answer", bb);
await denied(
  () => decide("answer", bb, "reject", { version: last.version - 1 }),
  "PT409",
);
eq(
  (
    await db.query(
      "select count(*)::int n from rhh_private.qa_moderation_events",
    )
  ).rows[0].n,
  eventCount,
);
eq(
  (
    await db.query(
      "select bool_and(state in ('pending_configuration','canceled')) good from rhh_private.qa_moderation_events",
    )
  ).rows[0].good,
  true,
);
const did = (
  await db.query(
    "select id from rhh_private.qa_decisions where answer_id=$1 order by created_at desc limit 1",
    [bb],
  )
).rows[0].id;

await db.exec(
  `set role rhh_admin_writer;select set_config('request.jwt.claim.sub','${admin}',false)`,
);
await db.query("select rhh_private.qa_record_moderation_event($1)", [did]);
await db.exec("reset role");
eq(
  (
    await db.query(
      "select count(*)::int n from rhh_private.qa_moderation_events",
    )
  ).rows[0].n,
  eventCount,
);
await denied(
  () => as(a, () => db.query("select * from rhh_private.qa_moderation_events")),
  "42501",
);
await denied(
  () => as(a, () => db.query("update rhh.answers set status='published'")),
  "42501",
);
await denied(
  () =>
    as(admin, () =>
      db.query("update rhh_private.qa_decisions set note='rewrite'"),
    ),
  "42501",
);
// Even an operator/future editor cannot leave changed reviewed text public.
await decide("answer", bb, "restore");
await decide("answer", bb, "publish");
const beforeBodyEdit = await detail("answer", bb);
await db.query(
  "update rhh.answers set body='An altered reviewed body requires a new moderation decision.' where id=$1",
  [bb],
);
const afterBodyEdit = await detail("answer", bb);
eq(afterBodyEdit.status, "pending");
eq(afterBodyEdit.version, beforeBodyEdit.version + 1);
eq((await rpc(null, "rhh_public_qa", [q])).questions[0].answers, []);
await denied(
  () =>
    decide("answer", bb, "publish", {
      version: beforeBodyEdit.version,
      parentVersion: beforeBodyEdit.parentVersion,
    }),
  "PT409",
);
eq(
  (
    await db.query(
      "select count(*)::int n from rhh_private.qa_answer_revisions where answer_id=$1 and version=$2",
      [bb, beforeBodyEdit.version],
    )
  ).rows[0].n,
  1,
);
const beforeQuestionEdit = await detail("question", q);
await db.query(
  "update rhh.questions set body='Altered question text requires another explicit publication review.' where id=$1",
  [q],
);
eq((await detail("question", q)).status, "pending");
eq((await rpc(null, "rhh_public_qa", [q])).questions, []);
await denied(
  () =>
    decide("question", q, "publish", { version: beforeQuestionEdit.version }),
  "PT409",
);
await decide("question", q, "reject");
eq((await rpc(null, "rhh_public_qa", [q])).questions, []);
eq(
  (
    await db.query(
      "select count(*)::int n from rhh_private.qa_moderation_events where event_type='qa.question_rejected' and recipient_id is null and state='canceled'",
    )
  ).rows[0].n,
  1,
);
await db.exec(
  "insert into rhh.questions(category_id,title,body) select 'mold-inspection','Pagination fixture question '||g,'Only local pagination fixture content; no real question.' from generate_series(1,21) g",
);
const page1 = await load(admin, {
    q: "Pagination fixture",
    page: 1,
    status: "all",
  }),
  page2 = await load(admin, {
    q: "Pagination fixture",
    page: 2,
    status: "all",
  });
eq(page1.total, 21);
eq(page1.items.length, 20);
eq(page1.hasNext, true);
eq(page2.items.length, 1);
eq(page2.hasNext, false);
eq(
  page1.items.some((x) => x.id === page2.items[0].id),
  false,
);
await denied(() => load(admin, { page: 0 }), "22023");
await denied(() => load(admin, { ownerId: a }), "22023");
await db.query("update rhh.accounts set role='member' where user_id=$1", [
  admin,
]);
await denied(() => load(), "42501");
await denied(
  () =>
    rpc(admin, "rhh_moderate_qa", [
      {
        kind: "question",
        id: q,
        version: 1,
        parentVersion: null,
        action: "publish",
        reason: "Cached pre-revocation request",
        note: "",
      },
    ]),
  "42501",
);
await denied(() => decide("question", q, "restore"), "42501");
await db.query("update rhh.accounts set role='admin' where user_id=$1", [
  admin,
]);
await db.query("delete from auth.sessions where user_id=$1", [admin]);
await denied(() => load(), "42501");
console.log(
  `PASS: ${checks} isolated Q&A moderation SQL assertions; synthetic Auth identities/storage metadata, not live JWT acceptance or overlapping transactions.`,
);
await db.close();
