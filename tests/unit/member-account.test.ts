import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { handleMemberRequest } from "../../src/data/supabase/member-handlers";
import { projectMemberWorkspace } from "../../src/data/supabase/member-account";
import { parseMemberMutation } from "../../src/validation/member-account";
import { safeAuthReturn } from "../../src/validation/auth";

const origin = "http://127.0.0.1:3230";
const profile = {
  name: "Member A",
  businessName: "Test business",
  email: "member@example.invalid",
  phone: "",
  website: "",
  city: "Raleigh",
  state: "NC",
  description: "Test-only business description for account checks.",
  practices: "Test-only healthy-home practices for account checks.",
  services: ["Inspection"],
  listedCredentials: ["Submitted claim"],
  categoryIds: ["mold-inspection"],
};
const catalog = [
  { id: "mold-inspection", name: "Mold Testing / Inspectors", monthlyUsd: 79, active: true },
];
const workspace = {
  catalog,
  application: {
    id: "00000000-0000-4000-8000-000000000001",
    version: 1,
    approval: "pending",
    membership: "inactive",
    suspended: false,
    profile,
    credentials: [{ name: "Submitted claim", verification: "unverified" }],
  },
};
test("inactive saved assignments load but only active replacements can be submitted", () => {
  const available = [
    { ...catalog[0], active: false },
    { id: "replacement", name: "Active replacement", monthlyUsd: 79, active: true },
  ];
  const loaded = projectMemberWorkspace({ ...workspace, catalog: available });
  assert.deepEqual(loaded.application?.profile.categoryIds, ["mold-inspection"]);
  assert.equal(loaded.catalog[0].active, false);
  assert.equal(parseMemberMutation({ profile, version: 1 }, available, true).ok, false);
  assert.equal(parseMemberMutation({ profile }, available, false).ok, false);
  const replacement = { ...profile, categoryIds: ["replacement"] };
  assert.equal(parseMemberMutation({ profile: replacement, version: 1 }, available, true).ok, true);
  assert.throws(() => projectMemberWorkspace({
    ...workspace,
    catalog: available.filter((category) => category.active),
  }));
});
function setup(t: TestContext, confirmed = true) {
  const old = { ...process.env };
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_ORIGIN: origin,
    RHH_AUTH_COOKIE_SECRET: "local-test-cookie-secret-at-least-32-characters",
  });
  delete process.env.VERCEL_ENV;
  t.after(() => {
    process.env = old;
  });
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    email: "member@example.invalid",
    email_confirmed_at: confirmed ? "2026-11-08T00:00:00Z" : null,
    app_metadata: {},
    user_metadata: { role: "admin" },
    created_at: "2026-11-08T00:00:00Z",
  };
  const token =
    [
      { alg: "HS256", typ: "JWT" },
      { sub: user.id, exp, iat: exp - 3600, aud: "authenticated" },
    ]
      .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url"))
      .join(".") + ".c2lnbmF0dXJl";
  const session = {
    access_token: token,
    refresh_token: "synthetic-refresh",
    expires_in: 3600,
    expires_at: exp,
    token_type: "bearer",
    user,
  };
  return {
    user,
    cookie: `sb-xjecnuebalmmblowmtks-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
  };
}
function req(
  method: string,
  body: unknown,
  cookie = "",
  requestOrigin = origin,
) {
  return new NextRequest(`${origin}/api/member/application`, {
    method,
    headers: {
      origin: requestOrigin,
      "content-type": "application/json",
      cookie,
    },
    ...(method !== "GET" ? { body: JSON.stringify(body) } : {}),
  });
}
test("connected profile validation rejects owner and protected fields at both envelope and profile boundaries", () => {
  for (const field of [
    "owner_id",
    "ownerId",
    "id",
    "role",
    "approval",
    "suspended",
    "membership",
    "featuredEntitlement",
    "verification",
    "internal_notes",
  ]) {
    assert.equal(
      parseMemberMutation(
        { profile: { ...profile, [field]: "forged" }, version: 1 },
        catalog,
        true,
      ).ok,
      false,
    );
    assert.equal(
      parseMemberMutation(
        { profile, version: 1, [field]: "forged" },
        catalog,
        true,
      ).ok,
      false,
    );
  }
  assert.equal(
    parseMemberMutation({ profile, version: 0 }, catalog, true).ok,
    false,
  );
  assert.equal(
    parseMemberMutation(
      { profile: { ...profile, services: ["Inspection", "Inspection"] } },
      catalog,
      false,
    ).ok,
    false,
  );
  assert.equal(
    parseMemberMutation({ profile, version: 1 }, catalog, true).ok,
    true,
  );
  assert.equal(safeAuthReturn("/list-your-business"), "/list-your-business");
});
test("member projection excludes admin, owner, reviewer and billing fields even in a widened adapter result", () => {
  const projected = projectMemberWorkspace({
    ...workspace,
    secret: "hidden",
    catalog: [{ ...catalog[0], billing_key: "hidden" }],
    application: {
      ...workspace.application,
      owner_id: "hidden",
      internal_notes: "hidden",
      stripe_customer_id: "hidden",
      credentials: [
        { ...workspace.application.credentials[0], reviewed_by: "hidden" },
      ],
      profile: { ...profile, internal_notes: "hidden" },
    },
  });
  assert.equal(JSON.stringify(projected).includes("hidden"), false);
  assert.equal(projected.application?.profile.email, profile.email);
  assert.throws(() =>
    projectMemberWorkspace({
      ...workspace,
      application: { ...workspace.application, approval: "invented" },
    }),
  );
});
test("member operations deny demo, anonymous, unconfirmed and cross-origin requests", async (t) => {
  const { user, cookie } = setup(t, false);
  t.mock.method(globalThis, "fetch", async () => Response.json(user));
  assert.equal((await handleMemberRequest(req("GET", null))).status, 401);
  assert.equal(
    (await handleMemberRequest(req("GET", null, cookie))).status,
    401,
  );
  assert.equal(
    (
      await handleMemberRequest(
        req("POST", { profile }, cookie, "https://evil.invalid"),
      )
    ).status,
    403,
  );
  process.env.RHH_APP_MODE = "demo";
  assert.equal(
    (await handleMemberRequest(req("GET", null, cookie))).status,
    404,
  );
});
test("member save forwards validated fields with caller JWT, never a browser owner or role", async (t) => {
  const { user, cookie } = setup(t);
  let saves = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/auth/v1/user")) return Response.json(user);
      if (url.endsWith("/rpc/rhh_save_profile")) {
        saves++;
        assert.deepEqual(JSON.parse(String(init?.body)), {
          profile,
          expected_version: 1,
        });
        assert.match(
          new Headers(init?.headers).get("authorization") ?? "",
          /^Bearer /,
        );
        return Response.json({
          ...workspace,
          application: { ...workspace.application, version: 2 },
        });
      }
      if (url.endsWith("/rpc/rhh_member_workspace"))
        return Response.json(workspace);
      throw new Error("Unexpected request");
    },
  );
  const response = await handleMemberRequest(
    req("PATCH", { profile, version: 1 }, cookie),
  );
  assert.equal(response.status, 200);
  assert.equal(saves, 1);
  assert.match(
    response.headers.get("cache-control") ?? "",
    /private.*no-store/,
  );
  assert.equal((await response.json()).application.version, 2);
  assert.equal(
    (
      await handleMemberRequest(
        req(
          "PATCH",
          { profile: { ...profile, owner_id: "B" }, version: 1 },
          cookie,
        ),
      )
    ).status,
    400,
  );
  assert.equal(saves, 1);
});
test("duplicate and stale saves are conflicts, provider failures are sanitized and never success", async (t) => {
  const { user, cookie } = setup(t);
  let failure = "application_exists";
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/auth/v1/user")) return Response.json(user);
    if (url.endsWith("/rpc/rhh_member_workspace"))
      return Response.json(workspace);
    return Response.json({ code: "P0001", message: failure }, { status: 400 });
  });
  assert.equal(
    (await handleMemberRequest(req("POST", { profile }, cookie))).status,
    409,
  );
  failure = "stale_profile";
  assert.equal(
    (await handleMemberRequest(req("PATCH", { profile, version: 1 }, cookie)))
      .status,
    409,
  );
  failure = "private database diagnostic";
  const failed = await handleMemberRequest(
    req("PATCH", { profile, version: 1 }, cookie),
  );
  assert.equal(failed.status, 503);
  assert.equal((await failed.text()).includes(failure), false);
});
test("member request body bounds reject oversized payloads before database operations", async (t) => {
  const { user, cookie } = setup(t);
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    assert.match(String(input), /\/auth\/v1\/user/);
    return Response.json(user);
  });
  assert.equal(
    (
      await handleMemberRequest(
        req("POST", { oversized: "x".repeat(32769) }, cookie),
      )
    ).status,
    413,
  );
});
