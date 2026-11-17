import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { pgcrypto } from "../output/database-test/node_modules/@electric-sql/pglite/dist/contrib/pgcrypto.js";
import { postgis } from "../output/database-test/node_modules/@electric-sql/pglite-postgis/dist/index.js";
import { openInquiryTestDatabase, a, b } from "./lib/inquiry-test-database.mjs";
const db = await openInquiryTestDatabase({ extensions: { postgis, pgcrypto } });
await db.exec(
  "create schema extensions;create extension pgcrypto with schema extensions;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);",
);
for (const name of (
  await readdir(new URL("../supabase/migrations/", import.meta.url))
)
  .filter(
    (n) =>
      n >= "20261113010253" &&
      n <= "20261114191404_connected_location_search.sql",
  )
  .sort())
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
const eq = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const denied = async (fn) => {
  await assert.rejects(fn);
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
        await db.query(`select public.${name}($1::jsonb) result`, [
          JSON.stringify(payload),
        ])
      ).rows[0].result,
  );
}
const profile = {
  name: "Location test",
  businessName: "Location acceptance test",
  email: "fixture@example.invalid",
  phone: "",
  website: "",
  city: "Test City",
  state: "NC",
  description: "Labelled isolated location fixture.",
  practices: "Synthetic test only.",
  categoryIds: ["mold-inspection"],
  services: ["Test service"],
  listedCredentials: [],
};
const ids = [];
for (const uid of [a, b])
  ids.push((await rpc(uid, "rhh_create_application", profile)).application.id);
await db.exec(
  "update rhh.applications set approval='approved';update rhh.memberships set status='active';",
);
const places = [];
for (const [city, lat, lon] of [
  ["Test City", 35, -78],
  ["Other City", 35.1, -78],
  ["Far City", 40, -80],
])
  places.push(
    (
      await db.query(
        "insert into rhh_private.geocode_places(city,state,zip,kind,latitude,longitude) values($1,'NC','','city',$2,$3) returning id",
        [city, lat, lon],
      )
    ).rows[0].id,
  );
const first = await rpc(a, "rhh_member_location", { action: "get" });
await denied(() => rpc(null, "rhh_member_location", { action: "get" }));
await denied(() =>
  rpc(a, "rhh_member_location", {
    action: "save",
    place: places[0],
    version: first.version,
    ownerId: b,
  }),
);
const saved = await rpc(a, "rhh_member_location", {
  action: "save",
  place: places[0],
  version: first.version,
});
eq(saved.location.id, places[0]);
await denied(() =>
  rpc(a, "rhh_member_location", {
    action: "save",
    place: places[1],
    version: first.version,
  }),
);
eq((await rpc(b, "rhh_member_location", { action: "get" })).location, null);
let result = await rpc(null, "rhh_directory_search", {});
eq(result.total, 2);
eq(result.missingCoordinates, 1);
eq(result.locations.filter((l) => l.location).length, 1);
result = await rpc(null, "rhh_directory_search", {
  place: places[0],
  sort: "nearest",
  radius: 10,
});
eq(result.total, 1);
eq(result.locations[0].distanceMiles, 0);
const distance = (
  await db.query(
    "select extensions.st_distance(extensions.st_setsrid(extensions.st_makepoint(-78,35),4326)::extensions.geography,extensions.st_setsrid(extensions.st_makepoint(-78,35.1),4326)::extensions.geography) meters",
  )
).rows[0].meters;
assert(distance > 11000 && distance < 11200);
checks++;
const bs = await rpc(b, "rhh_member_location", { action: "get" });
await rpc(b, "rhh_member_location", {
  action: "save",
  place: places[1],
  version: bs.version,
});
result = await rpc(null, "rhh_directory_search", {
  place: places[0],
  sort: "nearest",
  radius: 10,
});
eq(result.total, 2);
eq(result.profiles[0].id, ids[0]);
assert(
  result.locations[1].distanceMiles > 6.8 &&
    result.locations[1].distanceMiles < 7,
);
checks++;
eq(
  (await rpc(null, "rhh_directory_search", { place: places[2], radius: 10 }))
    .total,
  0,
);
await denied(() =>
  rpc(null, "rhh_directory_search", { latitude: 35, longitude: -78 }),
);
await denied(() => rpc(null, "rhh_directory_search", { radius: 9 }));
await denied(() => rpc(null, "rhh_directory_search", { sort: "nearest" }));
await denied(() => rpc(null, "rhh_directory_search", { page: 0 }));
eq(
  (
    await rpc(null, "rhh_directory_search", {
      category: "mold-remediation",
      state: "NC",
      q: "Location",
      minRating: 4,
    })
  ).total,
  0,
);
await db.query(
  "update rhh.applications set suspended=true where professional_id=$1",
  [ids[0]],
);
eq((await rpc(null, "rhh_directory_search", { place: places[0] })).total, 1);
await db.query(
  "update rhh.applications set suspended=false,approval='pending' where professional_id=$1",
  [ids[0]],
);
eq((await rpc(null, "rhh_directory_search", {})).total, 1);
await db.query(
  "update rhh.applications set approval='approved' where professional_id=$1",
  [ids[0]],
);
await db.query(
  "update rhh.memberships set status='inactive' where professional_id=$1",
  [ids[0]],
);
eq((await rpc(null, "rhh_directory_search", {})).total, 1);
await db.query(
  "update rhh.memberships set status='active' where professional_id=$1",
  [ids[0]],
);
await db.query(
  "update rhh.applications set suspended=false where professional_id=$1",
  [ids[0]],
);
await as(a, () =>
  denied(() => db.query("select * from rhh_private.professional_locations")),
);
assert.doesNotMatch(
  JSON.stringify(result),
  /owner_id|ownerId|credential_evidence|moderation_note|fixture@example/,
);
checks++;
await db.query("update rhh.professionals set city='Changed' where id=$1", [
  ids[0],
]);
eq((await rpc(a, "rhh_member_location", { action: "get" })).location, null);
const raw = (
  await db.query(
    "select extensions.st_x(point::extensions.geometry) x,extensions.st_y(point::extensions.geometry) y from rhh_private.professional_locations limit 1",
  )
).rows[0];
eq(raw, { x: -78, y: 35.1 });
await denied(() =>
  as(null, () =>
    db.query("select public.rhh_geocoding('forged','begin','{}')"),
  ),
);
// Real geography boundaries around exactly ten miles, no planar/degree approximation.
for (const [meters, expected] of [
  [16093.43, 1],
  [16093.45, 0],
]) {
  const boundary = (
    await db.query(
      "insert into rhh_private.geocode_places(city,state,zip,kind,latitude,longitude) select 'Boundary','NC','','city',extensions.st_y(p::extensions.geometry),extensions.st_x(p::extensions.geometry) from (select extensions.st_project(point,$1::double precision,0::double precision) p from rhh_private.geocode_places where id=$2) x returning id",
      [meters, places[0]],
    )
  ).rows[0].id;
  const current = await rpc(b, "rhh_member_location", { action: "get" });
  await rpc(b, "rhh_member_location", {
    action: "save",
    place: boundary,
    version: current.version,
  });
  eq(
    (await rpc(null, "rhh_directory_search", { place: places[0], radius: 10 }))
      .total,
    expected,
  );
}
eq((await rpc(null, "rhh_directory_search", { place: places[0] })).total, 2); // Any distance keeps unlocated A.
eq(
  (
    await rpc(null, "rhh_directory_search", {
      place: places[0],
      sort: "nearest",
    })
  ).total,
  1,
);
await db.query(
  "insert into rhh.reviews(professional_id,display_name,rating,body,status,published_at) values($1,'Test reviewer',5,'Isolated rating fixture only.','published',now()),($1,'Pending test',1,'Pending fixture only.','pending',null)",
  [ids[1]],
);
eq(
  (
    await rpc(null, "rhh_directory_search", {
      q: "Boundary",
      state: "NC",
      category: "mold-inspection",
      minRating: 5,
    })
  ).total,
  0,
); // Text remains business/service/category only.
eq(
  (
    await rpc(null, "rhh_directory_search", {
      state: "NC",
      category: "mold-inspection",
      minRating: 5,
    })
  ).total,
  1,
);
await db.query(
  "update rhh.reviews set status='hidden' where professional_id=$1 and status='published'",
  [ids[1]],
);
eq((await rpc(null, "rhh_directory_search", { minRating: 1 })).total, 0);
for (let i = 0; i < 6; i++) {
  const uid = randomUUID();
  await db.query(
    "insert into auth.users(id,email_confirmed_at) values($1,now())",
    [uid],
  );
  await db.query("insert into auth.sessions(id,user_id) values($1,$1)", [uid]);
  await rpc(uid, "rhh_create_application", profile);
}
await db.exec(
  "update rhh.applications set approval='approved';update rhh.memberships set status='active';",
);
const page1 = await rpc(null, "rhh_directory_search", {}),
  page2 = await rpc(null, "rhh_directory_search", { page: 2 });
eq(page1.total, 8);
eq(page1.profiles.length, 6);
eq(page2.profiles.length, 2);
const order = [...page1.profiles, ...page2.profiles].map((p) => p.id);
eq(new Set(order).size, 8);
eq(order, [...order].sort());
eq((await rpc(null, "rhh_directory_search", { page: 999 })).page, 2);
await db.query("update rhh.accounts set role='admin' where user_id=$1", [b]);
await denied(() => rpc(b, "rhh_member_location", { action: "get" }));
await as(a, () =>
  denied(() =>
    db.query(
      "update rhh_private.professional_locations set place_id=$1 where professional_id=$2",
      [places[0], ids[1]],
    ),
  ),
);

const gateway = "isolated-test-gateway-not-a-real-credential",
  hash = (s) => createHash("sha256").update(s).digest("hex");
await db.query("select rhh_private.configure_geocoding($1,2)", [hash(gateway)]);
const invoke = (operation, payload) =>
  as(
    null,
    async () =>
      (
        await db.query("select public.rhh_geocoding($1,$2,$3::jsonb) r", [
          gateway,
          operation,
          JSON.stringify({
            queryHash: hash("00501"),
            clientHash: hash("test-client"),
            budget: 2400,
            ...payload,
          }),
        ])
      ).rows[0].r,
  );
const grant = await invoke("begin", {});
eq(grant.state, "lookup");
eq((await invoke("begin", {})).state, "busy");
await denied(() => invoke("complete", { lease: randomUUID(), places: [] }));
const completed = await invoke("complete", {
  lease: grant.lease,
  places: [
    {
      city: "Holtsville",
      state: "NY",
      zip: "00501",
      kind: "postcode",
      latitude: 40.81,
      longitude: -73.04,
    },
  ],
});
eq(completed.places[0].zip, "00501");
eq((await invoke("begin", {})).state, "cached");
eq(
  (
    await db.query(
      "select used from rhh_private.geocode_limits where bucket='provider-day'",
    )
  ).rows[0].used,
  1,
);
const another = await invoke("begin", { queryHash: hash("Boston, MA") });
eq(another.state, "lookup");
eq((await invoke("begin", { queryHash: hash("Albany, NY") })).state, "budget");
await db.exec("delete from rhh_private.geocode_limits;");
await db.query(
  "update rhh_private.geocode_cache set lease_until=clock_timestamp()-interval '1 second' where query_hash=$1",
  [hash("Boston, MA")],
);
eq((await invoke("begin", { queryHash: hash("Boston, MA") })).state, "lookup"); // Abandoned lease recoverable.
await as(null, () =>
  denied(() => db.query("select * from rhh_private.geocode_config")),
);
await as(a, () =>
  denied(() =>
    db.query("select rhh_private.configure_geocoding($1,2800)", [
      hash(gateway),
    ]),
  ),
);
await db.exec("delete from rhh_private.geocode_limits;");
const retryGrant = await invoke("begin", { queryHash: hash("Retry test") });
eq(
  (
    await invoke("retry", {
      queryHash: hash("Retry test"),
      lease: retryGrant.lease,
    })
  ).state,
  "lookup",
);
eq(
  (
    await invoke("retry", {
      queryHash: hash("Retry test"),
      lease: retryGrant.lease,
    })
  ).state,
  "busy",
);
await db.exec("delete from rhh_private.geocode_limits;");
for (let i = 0; i < 10; i++) await invoke("begin", {});
eq((await invoke("begin", {})).state, "limited");
console.log(
  `PASS: ${checks} isolated SQL assertions with real PostGIS geography; synthetic Auth/listings, not hosted authenticated acceptance.`,
);
await db.close();
