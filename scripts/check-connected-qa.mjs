import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { openInquiryTestDatabase, a, b } from "./lib/inquiry-test-database.mjs";
const db = await openInquiryTestDatabase();
await db.exec(
  `create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);`,
);
for (const name of [
  "20261113010253_profile_media.sql",
  "20261113024706_connected_qa.sql",
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
const input = (extra = {}) => ({
  requestId: randomUUID(),
  title: "Local question title",
  body: "Local question body for testing, not medical advice.",
  categoryId: "mold-inspection",
  ...extra,
});
const request = input();
eq(await rpc(null, "rhh_submit_question", [request]), {
  saved: true,
  status: "pending",
});
eq(await rpc(null, "rhh_submit_question", [request]), {
  saved: true,
  status: "pending",
});
eq((await db.query("select count(*)::int n from rhh.questions")).rows[0].n, 1);
eq((await rpc(null, "rhh_public_qa", [null])).questions.length, 0);
await denied(
  () =>
    rpc(null, "rhh_submit_question", [
      { ...request, body: "Different content that exceeds twenty characters." },
    ]),
  "PT409",
);
await denied(
  () => rpc(null, "rhh_submit_question", [input({ authorId: a })]),
  "22023",
);
await denied(
  () => rpc(null, "rhh_submit_question", [input({ categoryId: "missing" })]),
  "22023",
);
await rpc(null, "rhh_submit_question", [input()]);
eq((await db.query("select count(*)::int n from rhh.questions")).rows[0].n, 1);
const q = (await db.query("select id from rhh.questions")).rows[0].id;
eq((await rpc(a, "rhh_member_qa", [null, 1])).eligible, false);
await db.query("update rhh.applications set approval='approved'");
await db.query("update rhh.memberships set status='active'");
eq((await rpc(a, "rhh_member_qa", [null, 1])).questions.length, 0);
eq(
  (
    await db.query(
      "select count(*)::int n from rhh_private.category_alert_events",
    )
  ).rows[0].n,
  0,
);
await db.query("update rhh.questions set status='published' where id=$1", [q]);
eq((await rpc(null, "rhh_public_qa", [q])).questions[0].id, q);
eq(
  (
    await db.query(
      "select count(*)::int n from rhh_private.category_alert_events",
    )
  ).rows[0].n,
  2,
);
await db.query("update rhh.questions set status='hidden' where id=$1", [q]);
eq((await rpc(null, "rhh_public_qa", [q])).questions.length, 0);
await db.query("update rhh.questions set status='published' where id=$1", [q]);
eq(
  (
    await db.query(
      "select count(*)::int n from rhh_private.category_alert_events",
    )
  ).rows[0].n,
  2,
);
const body = "A pending service answer with enough detail to validate.";
await denied(
  () => rpc(null, "rhh_submit_answer", [{ questionId: q, body }]),
  "42501",
);
await denied(
  () => rpc(a, "rhh_submit_answer", [{ questionId: q, body, authorId: b }]),
  "22023",
);
await db.query(
  "update rhh.professional_categories set category_id='healthy-builders' where professional_id=$1",
  [ids[1]],
);
eq((await rpc(b, "rhh_member_qa", [q, 1])).question, null);
await denied(
  () => rpc(b, "rhh_submit_answer", [{ questionId: q, body }]),
  "PT404",
);
await db.query(
  "update rhh.professional_categories set category_id='mold-inspection' where professional_id=$1",
  [ids[1]],
);
eq(await rpc(a, "rhh_submit_answer", [{ questionId: q, body }]), {
  saved: true,
  status: "pending",
  version: 1,
});
eq(await rpc(a, "rhh_submit_answer", [{ questionId: q, body }]), {
  saved: true,
  status: "pending",
  version: 1,
});
eq((await rpc(b, "rhh_member_qa", [q, 1])).answers.length, 0);
await rpc(b, "rhh_submit_answer", [
  { questionId: q, body: "Another pending answer from the second specialist." },
]);
let rows = (
  await db.query(
    "select id,professional_id from rhh.answers order by queue_position",
  )
).rows;
await denied(
  () =>
    db.query("update rhh.answers set status='published' where id=$1", [
      rows[1].id,
    ]),
  "PT409",
);
const revised = "Revised pending answer requiring the same moderation.";
eq(
  await rpc(a, "rhh_submit_answer", [
    { questionId: q, body: revised, version: 1 },
  ]),
  { saved: true, status: "pending", version: 2 },
);
await denied(
  () =>
    rpc(a, "rhh_submit_answer", [
      {
        questionId: q,
        body: "A stale change that must not overwrite the newer draft.",
        version: 1,
      },
    ]),
  "PT409",
);
eq(
  (
    await db.query(
      "select count(*)::int n from rhh_private.qa_answer_revisions",
    )
  ).rows[0].n,
  1,
);
await denied(
  () =>
    db.query("update rhh.answers set status='published' where id=$1", [
      rows[0].id,
    ]),
  "PT409",
);
await db.query("update rhh.answers set status='published' where id=$1", [
  rows[1].id,
]);
let publicQ = (await rpc(null, "rhh_public_qa", [q])).questions[0];
eq(publicQ.answers.length, 1);
eq(publicQ.answers[0].profileHref, `/professionals/${ids[1]}`);
eq(JSON.stringify(publicQ).includes("author_account_id"), false);
eq(JSON.stringify(publicQ).includes("moderation_note"), false);
eq(JSON.stringify(publicQ).includes("qa-b@example.invalid"), false);
await denied(
  () =>
    rpc(b, "rhh_submit_answer", [{ questionId: q, body: revised, version: 1 }]),
  "PT409",
);
await db.query(
  "update rhh.applications set suspended=true where professional_id=$1",
  [ids[1]],
);
publicQ = (await rpc(null, "rhh_public_qa", [q])).questions[0];
eq(publicQ.answers[0].profileHref, undefined);
eq((await rpc(b, "rhh_member_qa", [q, 1])).eligible, false);
await denied(
  () => rpc(b, "rhh_submit_answer", [{ questionId: q, body }]),
  "42501",
);
await db.query("update rhh.questions set status='hidden' where id=$1", [q]);
eq((await rpc(null, "rhh_public_qa", [q])).questions.length, 0);
eq((await rpc(a, "rhh_member_qa", [q, 1])).question, null);
await denied(
  () => as(a, () => db.query("select * from rhh.questions")),
  "42501",
);
await denied(
  () =>
    as(a, () => db.query("select * from rhh_private.category_alert_events")),
  "42501",
);
await denied(
  () => as(a, () => db.query("update rhh.answers set status='published'")),
  "42501",
);
await db.query("update rhh.accounts set role='admin' where user_id=$1", [a]);
await denied(() => rpc(a, "rhh_member_qa", [q, 1]), "42501");
await db.query("update rhh.accounts set role='member' where user_id=$1", [a]);
await db.query("delete from auth.sessions where user_id=$1", [a]);
await denied(() => rpc(a, "rhh_member_qa", [q, 1]), "42501");
for (let i = 0; i < 18; i++)
  await rpc(null, "rhh_submit_question", [
    input({ title: "Quota test question " + i }),
  ]);
await denied(
  () =>
    rpc(null, "rhh_submit_question", [
      input({ title: "Quota limit question request" }),
    ]),
  "PT429",
);
for (const categoryId of [
  "healthy-builders",
  "healthy-renovations",
  "healthy-trades",
  "healthy-designers",
])
  for (let i = 0; i < 20; i++)
    await rpc(null, "rhh_submit_question", [
      input({ categoryId, title: `Global quota fixture ${i}` }),
    ]);
await denied(
  () =>
    rpc(null, "rhh_submit_question", [
      input({
        categoryId: "health-practitioners",
        title: "Global quota boundary fixture",
      }),
    ]),
  "PT429",
);
console.log(
  `PASS: ${checks} isolated Q&A SQL assertions; synthetic Auth A/B and operator moderation, not hosted user acceptance.`,
);
await db.close();
