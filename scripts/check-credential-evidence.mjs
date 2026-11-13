import assert from "node:assert/strict";
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
const admin = "00000000-0000-4000-8000-000000000004";
await db.query(
  "insert into auth.users(id,email_confirmed_at) values($1,now())",
  [admin],
);
await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [admin]);
await db.query("insert into rhh.accounts(user_id,role) values($1,'admin')", [
  admin,
]);
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
  name: "Credential fixture",
  businessName: "Private credential test listing",
  email: "fixture@example.invalid",
  phone: "",
  website: "",
  city: "Raleigh",
  state: "NC",
  description: "Local credential integration test listing only.",
  practices: "Local test healthy-home practices.",
  categoryIds: ["mold-inspection"],
  services: ["Fixture service"],
  listedCredentials: ["Client-submitted test claim"],
};
const ids = [];
for (const uid of [a, b])
  ids.push(
    (await rpc(uid, "rhh_create_application", [profile])).application.id,
  );
const get = (uid) => rpc(uid, "rhh_member_credentials", [{ action: "get" }]);
const mutate = (uid, payload) => rpc(uid, "rhh_member_credentials", [payload]);
const ca = (await get(a)).claims[0],
  cb = (await get(b)).claims[0];
eq(ca.state, "pending");
eq(ca.verification, "unverified");
await denied(() => get(null), "42501");
await denied(() => rpc(a, "rhh_admin_credentials", [1]), "42501");
await denied(() => mutate(a, { action: "reserve", claimId: cb.id }), "PT404");
await denied(
  () =>
    mutate(a, { action: "reserve", claimId: ca.id, verification: "verified" }),
  "22023",
);
let draft = await mutate(a, { action: "reserve", claimId: ca.id });
eq(draft.objectPath, `${a}/${ids[0]}/${draft.id}.webp`);
eq(await rpc(b, "rhh_credential_file", [draft.id, false]), null);
await denied(() => rpc(b, "rhh_credential_file", [draft.id, true]), "42501");
await denied(
  () =>
    mutate(a, {
      action: "attach",
      claimId: ca.id,
      target: draft.id,
      version: 1,
    }),
  "PT409",
);
eq((await get(a)).claims[0].evidenceId, null);
await db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
  "rhh-credential-evidence",
  draft.objectPath,
]);
let state = await mutate(a, {
  action: "attach",
  claimId: ca.id,
  target: draft.id,
  version: 1,
});
eq(state.claims[0].version, 2);
eq(state.claims[0].state, "pending");
eq(
  (
    await mutate(a, {
      action: "attach",
      claimId: ca.id,
      target: draft.id,
      version: 1,
    })
  ).claims[0].version,
  2,
);
const review = (uid, action, version, evidenceId = draft.id) =>
  rpc(uid, "rhh_review_credential", [
    {
      claimId: ca.id,
      action,
      version,
      evidenceId,
      reason: "Local test credential review reason.",
    },
  ]);
await denied(() => review(a, "verify", 2), "42501");
eq(await review(admin, "verify", 2), {
  saved: true,
  state: "verified",
  version: 3,
});
eq((await get(a)).claims[0].verification, "verified");
eq(
  JSON.stringify(await get(a)).includes("Local test credential review reason."),
  false,
);
await denied(() => review(admin, "reject", 3), "PT409");
await denied(() => review(admin, "revoke", 2), "PT409");
const saved = await rpc(a, "rhh_member_workspace");
await rpc(a, "rhh_save_profile", [
  saved.application.profile,
  saved.application.version,
]);
eq((await get(a)).claims[0].state, "verified");
await db.query(
  "update rhh.applications set approval='approved' where professional_id=$1",
  [ids[0]],
);
await db.query(
  "update rhh.memberships set status='active',featured_entitlement='active' where professional_id=$1",
  [ids[0]],
);
const publicA = async () =>
  (await rpc(null, "rhh_public_directory")).profiles.find(
    (p) => p.id === ids[0],
  );
eq((await publicA()).verifiedCredentials, ["Client-submitted test claim"]);
eq(JSON.stringify(await publicA()).includes("evidenceId"), false);
eq(await review(admin, "revoke", 3), {
  saved: true,
  state: "revoked",
  version: 4,
});
eq((await publicA()).verifiedCredentials, []);
eq(await review(admin, "verify", 4), {
  saved: true,
  state: "verified",
  version: 5,
});
const replacement = await mutate(a, { action: "reserve", claimId: ca.id });
await db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
  "rhh-credential-evidence",
  replacement.objectPath,
]);
await denied(
  () =>
    mutate(a, {
      action: "attach",
      claimId: ca.id,
      target: replacement.id,
      version: 4,
    }),
  "PT409",
);
eq((await get(a)).claims[0].evidenceId, draft.id);
state = await mutate(a, {
  action: "attach",
  claimId: ca.id,
  target: replacement.id,
  version: 5,
});
eq(state.claims[0].state, "pending");
eq(state.claims[0].version, 6);
eq((await publicA()).verifiedCredentials, []);
await denied(() => review(admin, "verify", 5), "PT409");
await denied(() => review(admin, "verify", 6, draft.id), "PT409");
eq(
  (
    await db.query(
      "select state from rhh_private.credential_evidence where id=$1",
      [draft.id],
    )
  ).rows[0].state,
  "retained",
);
await denied(() => mutate(a, { action: "cancel", target: draft.id }), "PT409");
eq((await rpc(admin, "rhh_credential_file", [draft.id, true])).id, draft.id);
eq(await review(admin, "reject", 6, replacement.id), {
  saved: true,
  state: "rejected",
  version: 7,
});
eq(await review(admin, "verify", 7, replacement.id), {
  saved: true,
  state: "verified",
  version: 8,
});
state = await mutate(a, {
  action: "attach",
  claimId: ca.id,
  target: null,
  version: 8,
});
eq(state.claims[0].state, "pending");
eq(state.claims[0].evidenceId, null);
eq((await publicA()).verifiedCredentials, []);
await denied(() => review(admin, "verify", 9, null), "PT409");
let current = await rpc(a, "rhh_member_workspace");
await rpc(a, "rhh_save_profile", [
  { ...current.application.profile, listedCredentials: ["Changed test claim"] },
  current.application.version,
]);
eq((await get(a)).claims.length, 1);
eq((await get(a)).claims[0].state, "pending");
eq((await get(a)).claims[0].id === ca.id, false);
eq(
  (await db.query("select archived from rhh.credentials where id=$1", [ca.id]))
    .rows[0].archived,
  true,
);
let history = await rpc(admin, "rhh_admin_credentials", [1]);
const old = history.claims.find((c) => c.id === ca.id);
eq(old.archived, true);
eq(
  old.history.some((h) => h.action === "verify"),
  true,
);
eq(
  old.history.some((h) => h.action === "claim_changed"),
  true,
);
eq(
  old.history.every((h) => h.at && h.version && h.claimName),
  true,
);
await denied(
  () =>
    as(a, () => db.query("update rhh.credentials set verification='verified'")),
  "42501",
);
await denied(
  () => as(a, () => db.query("select * from rhh_private.credential_reviews")),
  "42501",
);
// Abandoned drafts are bounded and cleaned only after the in-flight grace.
const unused = [];
for (let n = 0; n < 4; n++)
  unused.push(await mutate(b, { action: "reserve", claimId: cb.id }));
await denied(() => mutate(b, { action: "reserve", claimId: cb.id }), "PT429");
await mutate(b, { action: "cancel", target: unused[0].id });
eq(await mutate(b, { action: "cleanup" }), []);
await db.query(
  "update rhh_private.credential_evidence set created_at=now()-interval '11 minutes' where id=$1",
  [unused[0].id],
);
eq((await mutate(b, { action: "cleanup" }))[0].id, unused[0].id);
await mutate(a, { action: "ack", target: unused[0].id });
eq(
  (
    await db.query(
      "select count(*)::int n from rhh_private.credential_evidence where id=$1",
      [unused[0].id],
    )
  ).rows[0].n,
  1,
);
await mutate(b, { action: "ack", target: unused[0].id });
eq(
  (
    await db.query(
      "select count(*)::int n from rhh_private.credential_evidence where id=$1",
      [unused[0].id],
    )
  ).rows[0].n,
  0,
);
await db.query(
  "update rhh_private.credential_evidence set created_at=now()-interval '25 hours' where id=$1",
  [unused[1].id],
);
await denied(
  () =>
    mutate(b, {
      action: "attach",
      claimId: cb.id,
      target: unused[1].id,
      version: 1,
    }),
  "PT404",
);
await mutate(b, { action: "cleanup" });
eq(await rpc(b, "rhh_credential_file", [unused[1].id, false]), null);
await db.query(
  "update rhh_private.credential_upload_limits set attempts=10 where owner_id=$1",
  [b],
);
await denied(() => mutate(b, { action: "reserve", claimId: cb.id }), "PT429");
await denied(
  () =>
    rpc(admin, "rhh_review_credential", [
      {
        claimId: cb.id,
        version: 1,
        evidenceId: null,
        action: "verify",
        reason: "Local forged reviewer test",
        reviewedBy: a,
      },
    ]),
  "22023",
);
await denied(
  () =>
    as(admin, () =>
      db.query(
        "update rhh_private.credential_reviews set reason='forged rewrite'",
      ),
    ),
  "42501",
);
await db.query("update rhh.accounts set role='member' where user_id=$1", [
  admin,
]);
await denied(() => rpc(admin, "rhh_admin_credentials", [1]), "42501");
await denied(
  () => rpc(admin, "rhh_credential_file", [draft.id, true]),
  "42501",
);
await db.query("update rhh.accounts set role='admin' where user_id=$1", [
  admin,
]);
await db.query("delete from auth.sessions where user_id=$1", [admin]);
await denied(() => rpc(admin, "rhh_admin_credentials", [1]), "42501");
eq(
  (
    await db.query(
      "select public from storage.buckets where id='rhh-credential-evidence'",
    )
  ).rows[0].public,
  false,
);
console.log(
  `PASS: ${checks} isolated credential/evidence SQL assertions. Synthetic Auth/storage metadata; not real login or file transfer.`,
);
await db.close();
