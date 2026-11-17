import { aboutAssetsAvailable } from "../../src/data/supabase/content-assets";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import type { AuthDatabase } from "../../src/data/supabase/database.types";
import { emptyContent } from "../../src/domain/site-content";
import {
  parseContentFields,
  parseContentMutation,
  projectContentWorkspace,
  projectPublishedContent,
  safeProviderUrl,
  contentQuery,
} from "../../src/validation/site-content";
import { adminContent } from "../../src/data/supabase/site-content";
import { GET, POST } from "../../src/app/api/admin/content/route";
import { siteMetadata } from "../../src/features/content/metadata";
import { publicContent } from "../../src/data/supabase/site-content";
const id = "00000000-0000-4000-8000-000000000001";
const fields = {
  title: "Synthetic title",
  summary: "Synthetic editorial summary for testing only.",
  category: "planning",
  body: "Synthetic article content for isolated regression tests only.",
};
const doc = {
  id,
  kind: "resource" as const,
  key: "synthetic-article",
  fields,
  version: 1,
  published: null,
  publishedVersion: null,
};
const state = { page: 1, total: 1, items: [doc], history: [] };
test("public loader and metadata use published fields and fail closed without fictional fallback", async (t) => {
  const old = { ...process.env };
  t.after(() => {
    process.env = old;
  });
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  });
  delete process.env.VERCEL_ENV;
  let unavailable = false,
    hidden = false;
  t.mock.method(globalThis, "fetch", async () =>
    unavailable
      ? Response.json({ message: "PRIVATE BACKEND DETAILS" }, { status: 503 })
      : Response.json({
          page: 1,
          total: hidden ? 0 : 1,
          items: hidden
            ? []
            : [
                {
                  kind: "resource",
                  key: doc.key,
                  fields,
                  draft: { title: "PRIVATE DRAFT" },
                  snapshot: { body: "PRIVATE HISTORY" },
                },
              ],
          internalNotes: "PRIVATE NOTE",
        }),
  );
  assert.deepEqual(await publicContent("resource", doc.key), {
    page: 1,
    total: 1,
    items: [{ kind: "resource", key: doc.key, fields }],
  });
  assert.deepEqual(await siteMetadata("resource", doc.key), {
    title: fields.title,
    description: fields.summary,
  });
  hidden = true;
  assert.deepEqual((await publicContent("resource", doc.key)).items, []);
  assert.equal(
    (await siteMetadata("resource", doc.key)).title,
    "Resource article",
  );
  unavailable = true;
  await assert.rejects(
    () => publicContent("resource"),
    /temporarily unavailable/,
  );
  assert.doesNotMatch(
    JSON.stringify(await siteMetadata("resource", doc.key)),
    /PRIVATE|Synthetic/,
  );
});
test("content mutations have explicit identity, fields, versions and publication approval", () => {
  const create = {
    action: "create",
    kind: "resource",
    key: doc.key,
    fields,
    reason: "Client-approved test",
  };
  assert.deepEqual(parseContentMutation(create), create);
  for (const extra of [
    { key: "Bad Slug" },
    { key: "../admin" },
    { role: "admin" },
    { actorId: id },
    { published: true },
    { fields: { ...fields, status: "published" } },
    { fields: { ...fields, title: "x".repeat(121) } },
  ])
    assert.equal(parseContentMutation({ ...create, ...extra }), null);
  const publish = {
    action: "publish",
    id,
    kind: "resource",
    version: 1,
    approved: true,
    reason: "Approved copy",
  };
  assert.deepEqual(parseContentMutation(publish), publish);
  for (const extra of [
    { approved: "true" },
    { version: "1" },
    { version: 0 },
    { key: "changed-slug" },
    { fields },
  ])
    assert.equal(parseContentMutation({ ...publish, ...extra }), null);
  assert.equal(
    parseContentMutation({
      action: "save",
      id,
      kind: "resource",
      version: 1,
      fields,
      reason: "Save draft",
    })?.action,
    "save",
  );
  assert.deepEqual(
    contentQuery(new URLSearchParams({ record: id, page: "2" })),
    { action: "get", page: 2, id },
  );
  for (const q of ["record=private", "page=0", "page=1&page=2", "role=admin"])
    assert.equal(contentQuery(new URLSearchParams(q)), null);
});
test("drafts permit missing client copy, publication requires complete content and safe sources", async () => {
  assert.deepEqual(
    parseContentFields("about", emptyContent("about")),
    emptyContent("about"),
  );
  assert.equal(parseContentFields("about", emptyContent("about"), true), null);
  assert.equal(await aboutAssetsAvailable({ videoSrc: "" }), true);
  assert.equal(
    await aboutAssetsAvailable({ videoSrc: "https://evil.example/film.mp4" }),
    false,
  );
  assert.equal(
    await aboutAssetsAvailable({
      videoSrc: "/media/client/no-approved-file-fixture.mp4",
      captionsSrc: "/media/client/no-approved-file-fixture.vtt",
    }),
    false,
  );
  const about = {
    ...emptyContent("about"),
    title: "Approved title",
    summary: "Approved introduction",
    story: "Approved story",
    why: "Approved purpose",
  };
  assert(parseContentFields("about", about, true));
  for (const videoSrc of [
    "<iframe src='evil'>",
    "https://evil.example/film.mp4",
    "/media/client/../secret.mp4",
    "/media/client/movie.svg",
  ])
    assert.equal(parseContentFields("about", { ...about, videoSrc }), null);
  assert.equal(
    parseContentFields(
      "about",
      { ...about, videoSrc: "/media/client/approved.mp4" },
      true,
    ),
    null,
  );
  assert(
    parseContentFields(
      "about",
      {
        ...about,
        videoSrc: "/media/client/approved.mp4",
        captionsSrc: "/media/client/approved.vtt",
        transcript: "Approved transcript",
      },
      true,
    ),
  );
  assert(
    parseContentFields("resource", {
      ...fields,
      body: "<script>alert('plain text')</script>",
    }),
  );
  for (const url of [
    "javascript:alert(1)",
    "//provider.example",
    "https://user:pass@provider.example",
    "https://example.com\\@evil.example",
    "http://provider.example",
    "https://provider#not-a-domain.example",
  ])
    assert.equal(safeProviderUrl(url), false);
  assert(
    safeProviderUrl("https://provider.example/training?topic=home#details"),
  );
  assert.equal(
    parseContentFields("contact", {
      ...emptyContent("contact"),
      email: "a@example.com\r\nBcc:evil",
    }),
    null,
  );
  assert.equal(
    parseContentFields(
      "privacy",
      { ...emptyContent("privacy"), body: "" },
      true,
    ),
    null,
  );
});
test("public/editor projections exclude source records, history internals and authority fields", () => {
  const published = { kind: "resource", key: doc.key, fields };
  assert.deepEqual(
    projectPublishedContent({
      ...published,
      draft: { title: "PRIVATE" },
      actorId: id,
      secret: "PRIVATE",
    }),
    published,
  );
  assert.deepEqual(
    projectContentWorkspace({
      ...state,
      secret: "PRIVATE",
      items: [{ ...doc, ownerEmail: "PRIVATE" }],
    }),
    state,
  );
  assert.equal(
    projectPublishedContent({
      ...published,
      fields: { ...fields, internalNotes: "PRIVATE" },
    }),
    null,
  );
  assert.equal(
    projectContentWorkspace({
      ...state,
      items: [
        {
          ...doc,
          published: { ...published, fields: { ...fields, title: "" } },
        },
      ],
    }),
    null,
  );
});
test("content adapter validates acknowledgments and suppresses raw database errors", async (t) => {
  const client = createClient<AuthDatabase>(
    "https://xjecnuebalmmblowmtks.supabase.co",
    "sb_publishable_test",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  let flag: unknown = true,
    denied = false;
  t.mock.method(globalThis, "fetch", async () =>
    denied
      ? Response.json(
          { code: "42501", message: "PRIVATE DB DETAIL" },
          { status: 403 },
        )
      : Response.json({
          ...state,
          saved: true,
          unchanged: flag,
          secret: "PRIVATE",
        }),
  );
  assert.deepEqual(await adminContent(client, { action: "save" }), {
    ...state,
    saved: true,
    unchanged: true,
  });
  flag = "true";
  assert.deepEqual(await adminContent(client, { action: "save" }), {
    ...state,
    saved: true,
  });
  denied = true;
  await assert.rejects(() => adminContent(client), {
    status: 403,
    message: "Current administrator access is required.",
  });
});
test("content API preserves mode, origin and anonymous boundaries", async (t) => {
  const env = (key: string, value: string) => {
    const old = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (old === undefined) delete process.env[key];
      else process.env[key] = old;
    });
  };
  env("RHH_APP_MODE", "demo");
  assert.equal(
    (await GET(new NextRequest("http://127.0.0.1:3230/api/admin/content")))
      .status,
    404,
  );
  env("RHH_APP_MODE", "staging");
  env("RHH_AUTH_ORIGIN", "http://127.0.0.1:3230");
  env("NEXT_PUBLIC_SUPABASE_URL", "https://xjecnuebalmmblowmtks.supabase.co");
  env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  env(
    "RHH_AUTH_COOKIE_SECRET",
    "synthetic-only-cookie-secret-at-least-32-characters",
  );
  assert.equal(
    (
      await POST(
        new NextRequest("http://127.0.0.1:3230/api/admin/content", {
          method: "POST",
          headers: { origin: "https://evil.example" },
        }),
      )
    ).status,
    403,
  );
  env(
    "RHH_AUTH_COOKIE_SECRET",
    "synthetic-only-cookie-secret-at-least-32-characters",
  );
  const r = await GET(
    new NextRequest("http://127.0.0.1:3230/api/admin/content"),
  );
  assert.equal(r.status, 401);
  assert.match(r.headers.get("cache-control") ?? "", /private.*no-store/);
});
