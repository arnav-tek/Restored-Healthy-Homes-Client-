import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { processProfileImage } from "../../src/data/media/process-profile-image";
import {
  parseMediaRoute,
  parseMediaSave,
  parseMediaState,
} from "../../src/validation/profile-media";
import {
  profileImageInputLimit,
  publicProfileImageHref,
} from "../../src/domain/profile-media";
import {
  handleMemberMedia,
  handlePublicProfileImage,
} from "../../src/data/media/handlers";
const id = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
test("profile image processing fully decodes, rotates/resizes and strips metadata for accepted formats", async () => {
  for (const type of ["jpeg", "png", "webp"] as const) {
    const source = await sharp({
      create: { width: 1600, height: 800, channels: 4, background: "#556655" },
    })
      .withMetadata({ orientation: 6 })
      .toFormat(type)
      .toBuffer();
    const out = await processProfileImage(source, `image/${type}`);
    const m = await sharp(out).metadata();
    assert.equal(m.format, "webp");
    assert.ok(m.width! <= 1200 && m.height! <= 1200);
    assert.equal(m.exif, undefined);
    assert.equal(m.icc, undefined);
    assert.equal(m.orientation, undefined);
    assert.ok(out.length <= 1024 * 1024);
  }
});
test("profile image processing rejects oversized, disguised, unsupported, truncated and malformed images", async () => {
  const png = await sharp({
    create: { width: 1, height: 1, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  for (const [bytes, type] of [
    [png, "image/jpeg"],
    [png, "image/svg+xml"],
    [png, "image/gif"],
    [Buffer.from('<svg onload="alert(1)"></svg>'), "image/png"],
    [Buffer.from("broken"), "image/webp"],
    [png.subarray(0, 20), "image/png"],
    [Buffer.alloc(profileImageInputLimit + 1), "image/png"],
  ] as const)
    await assert.rejects(() => processProfileImage(bytes, type));
  const huge = await sharp({
    create: { width: 5000, height: 4000, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  await assert.rejects(() => processProfileImage(huge, "image/png"));
});
test("media projections and mutations exclude owner IDs, arbitrary paths and unexpected fields", () => {
  assert.deepEqual(
    parseMediaRoute({
      id,
      objectPath: `${other}/${id}.webp`,
      ownerId: "PRIVATE",
    }),
    { id, objectPath: `${other}/${id}.webp` },
  );
  for (const path of [
    "../secret",
    `other/${id}.webp`,
    `${other}/../secret`,
    `${other}/${other}.webp`,
    "https://bad.invalid/file",
  ])
    assert.equal(parseMediaRoute({ id, objectPath: path }), null);
  const state = parseMediaState({
    version: 1,
    photoId: id,
    published: false,
    drafts: [],
    secret: "PRIVATE",
  });
  assert.equal(JSON.stringify(state).includes("PRIVATE"), false);
  assert.equal(
    parseMediaSave({ target: id, version: 1, published: true, ownerId: other }),
    null,
  );
  assert.equal(
    parseMediaSave({ target: "../../bad", version: 1, published: true }),
    null,
  );
  assert.equal(
    parseMediaSave({ target: id, version: 0, published: true }),
    null,
  );
  assert.equal(publicProfileImageHref("bad", id), null);
  assert.equal(
    publicProfileImageHref(other, id),
    `/api/public/profile-image/${other}/${id}`,
  );
});
test("anonymous member operations and cross-site image mutations are denied before privileged Storage access", async (t) => {
  const old = { ...process.env };
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_ORIGIN: "http://127.0.0.1:3230",
    RHH_AUTH_COOKIE_SECRET: "local-test-secret-000000000000000000000",
  });
  delete process.env.VERCEL_ENV;
  delete process.env.SUPABASE_SECRET_KEY;
  t.after(() => {
    process.env = old;
  });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw new Error("Unexpected network");
  });
  const guest = await handleMemberMedia(
    new NextRequest("http://127.0.0.1:3230/api/member/profile-media"),
  );
  assert.equal(guest.status, 401);
  assert.match(guest.headers.get("cache-control")!, /private/);
  const forged = await handleMemberMedia(
    new NextRequest("http://127.0.0.1:3230/api/member/profile-media", {
      method: "PATCH",
      headers: { origin: "https://evil.invalid" },
      body: "{}",
    }),
  );
  assert.equal(forged.status, 403);
  assert.equal(calls, 0);
  assert.equal((await handlePublicProfileImage("bad", id)).status, 404);
  assert.equal(calls, 0);
});
test("unpublished or unavailable public image routing never invokes privileged Storage and does not expose diagnostics", async (t) => {
  const old = { ...process.env };
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  });
  delete process.env.VERCEL_ENV;
  delete process.env.SUPABASE_SECRET_KEY;
  t.after(() => {
    process.env = old;
  });
  const urls: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return Response.json(null);
  });
  const r = await handlePublicProfileImage(other, id);
  assert.equal(r.status, 404);
  assert.match(r.headers.get("cache-control")!, /no-store/);
  assert.equal(await r.text(), "");
  assert.equal(urls.length, 1);
  assert.match(urls[0], /rpc\/rhh_public_profile_media/);
});
