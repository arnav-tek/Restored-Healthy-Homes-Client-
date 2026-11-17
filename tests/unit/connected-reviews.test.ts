import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "../../src/data/supabase/database.types";
import {
  parseReviewSubmission,
  parseReviewDecision,
  parseReviewFilters,
  parsePublicReviews,
  parseMemberReviews,
} from "../../src/validation/connected-reviews";
import { handleReviewRequest } from "../../src/data/supabase/review-handler";
import {
  loadAdminReviews,
  moderateConnectedReview,
} from "../../src/data/supabase/reviews";
import { summarizeReviews, type PublicReview } from "../../src/domain/review";
import {
  searchPublicDirectory,
  defaultSearch,
} from "../../src/domain/directory-search";
import { parseSearchQuery } from "../../src/validation/directory";
import { categories } from "../../src/domain/categories";
import { projectPublicDirectory } from "../../src/data/supabase/public-directory";
import type { PublicProfile } from "../../src/domain/professional";
const id = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
const fields = {
  requestId: id,
  displayName: "Public visitor",
  rating: 4,
  body: "A public service review with sufficient detail.",
};
const review: PublicReview = {
  id,
  professionalId: id,
  displayName: fields.displayName,
  rating: 4,
  body: fields.body,
  publishedAt: "2026-11-13T00:00:00Z",
};
const profile: PublicProfile = {
  id,
  businessName: "Example business",
  publicDisplayName: "",
  city: "Raleigh",
  state: "NC",
  specialty: "Inspection",
  summary: "Service details",
  serviceArea: "",
  categoryIds: [categories[0].id],
  services: [],
  verifiedCredentials: [],
  listedCredentials: [],
  contact: { email: "", phone: "", website: "" },
};
test("review submissions and decisions reject authority, contact and score forgery", () => {
  assert.ok(parseReviewSubmission(fields));
  for (const k of [
    "professionalId",
    "ownerId",
    "status",
    "moderationNote",
    "verifiedCustomer",
    "contactEmail",
  ])
    assert.equal(parseReviewSubmission({ ...fields, [k]: "forged" }), null);
  for (const rating of [0, 6, 1.5, NaN])
    assert.equal(parseReviewSubmission({ ...fields, rating }), null);
  const decision = {
    id,
    version: 1,
    action: "publish",
    reason: "Reviewed test submission",
    note: "",
  };
  assert.ok(parseReviewDecision(decision));
  for (const k of [
    "rating",
    "body",
    "actorId",
    "publishedAt",
    "recipientEmail",
  ])
    assert.equal(parseReviewDecision({ ...decision, [k]: "forged" }), null);
  assert.equal(parseReviewDecision({ ...decision, version: 0 }), null);
  assert.equal(parseReviewFilters({ professional: "bad" }), null);
});
test("review projections strip private contacts/notes and reject malformed or duplicate public records", () => {
  const parsed = parsePublicReviews([
    {
      ...review,
      contactEmail: "PRIVATE",
      note: "PRIVATE",
      dispute: "PRIVATE",
      actorId: "PRIVATE",
    },
  ]);
  assert.deepEqual(parsed, [review]);
  assert.equal(parsePublicReviews([review, review]), null);
  assert.equal(
    parseMemberReviews({
      professionalId: id,
      reviews: [{ ...review, professionalId: other }],
    }),
    null,
  );
  const data = projectPublicDirectory({
    catalog: [],
    profiles: [{ ...profile, freeConsultation: false, featured: false }],
    reviews: [review, { ...review, id: other, professionalId: other }],
  });
  assert.equal(data.reviews.length, 1);
  assert.throws(
    () => projectPublicDirectory({ catalog: [], profiles: [] }),
    /unavailable/,
  );
});
test("one review calculation handles no reviews, weighted averages and duplicate IDs consistently", () => {
  assert.deepEqual(summarizeReviews([]), { count: 0, average: null });
  const items: PublicReview[] = [
    { ...review, rating: 5 },
    { ...review, id: other, professionalId: other, rating: 1 },
    {
      ...review,
      id: "00000000-0000-4000-8000-000000000003",
      professionalId: other,
      rating: 1,
    },
  ];
  assert.deepEqual(summarizeReviews(items), { count: 3, average: 2.3 });
  assert.deepEqual(summarizeReviews([...items, items[0]]), {
    count: 3,
    average: 2.3,
  });
});
test("rating filters/sort combine with category/state/text before stable directory pagination", () => {
  const profiles = Array.from({ length: 8 }, (_, n) => ({
    ...profile,
    id: `00000000-0000-4000-8000-${String(n + 1).padStart(12, "0")}`,
    businessName: `Example business ${n}`,
  }));
  const reviews: PublicReview[] = profiles.slice(0, 7).map((p, n) => ({
    ...review,
    id: p.id,
    professionalId: p.id,
    rating: n === 0 ? 5 : 4,
  }));
  const query = {
    ...defaultSearch,
    q: "Example",
    category: categories[0].id,
    state: "NC",
    minRating: 4,
    sort: "rating" as const,
    page: 2,
  };
  const result = searchPublicDirectory(
    profiles,
    categories,
    query,
    [],
    undefined,
    reviews,
  );
  assert.equal(result.total, 7);
  assert.equal(result.hits.length, 1);
  assert.equal(result.pages, 2);
  assert.equal(
    searchPublicDirectory(
      profiles,
      categories,
      { ...query, page: 1 },
      [],
      undefined,
      reviews,
    ).hits[0].professional.id,
    profiles[0].id,
  );
  assert.equal(
    searchPublicDirectory(
      profiles,
      categories,
      { ...query, minRating: 5 },
      [],
      undefined,
      reviews,
    ).total,
    1,
  );
  assert.equal(
    searchPublicDirectory(
      profiles,
      categories,
      { ...query, state: "VA" },
      [],
      undefined,
      reviews,
    ).total,
    0,
  );
  assert.equal(
    parseSearchQuery({ sort: "rating", minRating: "4.5" }, categories).errors
      .sort,
    undefined,
  );
});
test("anonymous private review access, cross-origin and forged public fields fail without private reads", async (t) => {
  const old = { ...process.env };
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_ORIGIN: "http://127.0.0.1:3230",
    RHH_AUTH_COOKIE_SECRET: "test-only-secret-00000000000000000000",
  });
  delete process.env.VERCEL_ENV;
  t.after(() => {
    process.env = old;
  });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({ saved: true, privateContact: "PRIVATE" });
  });
  for (const scope of ["member", "admin"] as const) {
    const r = await handleReviewRequest(
      new NextRequest(`http://127.0.0.1:3230/api/${scope}/reviews`),
      scope,
    );
    assert.equal(r.status, 401);
    assert.match(r.headers.get("cache-control")!, /private.*no-store/);
  }
  const req = (origin: string, body: unknown) =>
    new NextRequest(`http://127.0.0.1:3230/api/public/reviews/${id}`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await handleReviewRequest(
        req("https://evil.invalid", fields),
        "public",
        id,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handleReviewRequest(
        req("http://127.0.0.1:3230", { ...fields, status: "published" }),
        "public",
        id,
      )
    ).status,
    400,
  );
  assert.equal(calls, 0);
  const saved = await handleReviewRequest(
    req("http://127.0.0.1:3230", fields),
    "public",
    id,
  );
  assert.deepEqual(await saved.json(), { saved: true });
  assert.equal(calls, 1);
});
test("review adapters authorize every admin action and sanitize stale/denied responses", async () => {
  let calls = 0;
  const client = createClient<AuthDatabase>(
    "https://example.supabase.co",
    "sb_publishable_test",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async () =>
          Response.json(
            {
              code: ++calls === 1 ? "42501" : "PT409",
              message: "PRIVATE_DIAGNOSTIC",
            },
            { status: calls === 1 ? 403 : 409 },
          ),
      },
    },
  );
  await assert.rejects(
    () => loadAdminReviews(client, parseReviewFilters({})!),
    /not permitted/,
  );
  await assert.rejects(
    () =>
      moderateConnectedReview(client, {
        id,
        version: 1,
        action: "publish",
        reason: "Test moderation reason",
        note: "",
      }),
    (e) =>
      e instanceof Error &&
      !e.message.includes("PRIVATE") &&
      e.message.includes("draft is retained"),
  );
  assert.equal(calls, 2);
});

test("review adapter/API preserve only explicit boolean unchanged and retain the normal allowlisted response", async (t) => {
  const old = { ...process.env };
  const url = "https://xjecnuebalmmblowmtks.supabase.co";
  const origin = "http://127.0.0.1:3230";
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_ORIGIN: origin,
    RHH_AUTH_COOKIE_SECRET: "test-only-secret-00000000000000000000",
  });
  delete process.env.VERCEL_ENV;
  t.after(() => {
    process.env = old;
  });
  const user = {
    id,
    aud: "authenticated",
    email: "fixture@example.invalid",
    email_confirmed_at: "2026-11-13T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-11-13T00:00:00Z",
  };
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const token =
    [
      { alg: "HS256", typ: "JWT" },
      { sub: id, exp: expires, iat: expires - 3600, aud: "authenticated" },
    ]
      .map((p) => Buffer.from(JSON.stringify(p)).toString("base64url"))
      .join(".") + ".c2lnbmF0dXJl";
  const cookie =
    "sb-xjecnuebalmmblowmtks-auth-token=base64-" +
    Buffer.from(
      JSON.stringify({
        access_token: token,
        refresh_token: "synthetic-refresh",
        expires_at: expires,
        expires_in: 3600,
        token_type: "bearer",
        user,
      }),
    ).toString("base64url");
  const decision = {
    id,
    version: 3,
    action: "publish" as const,
    reason: "Confirm saved private note",
    note: "Existing note",
  };
  const normal = { saved: true, status: "published", version: 3 };
  let databaseResult: Record<string, unknown> = normal;
  let rpcCalls = 0;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const target = String(input);
    if (target === `${url}/auth/v1/user`) return Response.json(user);
    assert.ok(
      target.startsWith(`${url}/rest/v1/rpc/rhh_moderate_review`),
      "Only the expected moderation RPC may run",
    );
    rpcCalls++;
    return Response.json(databaseResult);
  });
  const client = createClient<AuthDatabase>(url, "sb_publishable_test", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const [extra, expected] of [
    [{ unchanged: true }, { ...normal, unchanged: true }],
    [{}, normal],
    [{ unchanged: false }, normal],
    [{ unchanged: "true" }, normal],
  ] as const) {
    databaseResult = {
      ...normal,
      ...extra,
      contactEmail: "PRIVATE",
      actorId: "PRIVATE",
      diagnostics: "PRIVATE",
    };
    assert.deepEqual(await moderateConnectedReview(client, decision), expected);
    const response = await handleReviewRequest(
      new NextRequest(`${origin}/api/admin/reviews`, {
        method: "POST",
        headers: { origin, "content-type": "application/json", cookie },
        body: JSON.stringify(decision),
      }),
      "admin",
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected);
    assert.match(response.headers.get("cache-control")!, /private.*no-store/);
  }
  assert.equal(rpcCalls, 8);
});
