import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { handleAdminRequest } from "../../src/data/supabase/admin-handlers";
import { parseAdminDecision } from "../../src/validation/admin-account";
import { projectAdminWorkspace } from "../../src/data/supabase/admin-account";
import { projectPublicDirectory } from "../../src/data/supabase/public-directory";
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
  {
    id: "mold-inspection",
    name: "Mold Testing / Inspectors",
    monthlyUsd: 79,
    active: true,
  },
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

const adminWorkspace = {
  catalog,
  applications: [
    {
      ...workspace.application,
      decisionVersion: 1,
      decisionReason: "",
      suspensionReason: "",
      internalNotes: "Private note",
      submittedAt: "2026-11-10T00:00:00Z",
      history: [],
    },
  ],
};
const decision = {
  id: workspace.application.id,
  version: 1,
  decisionVersion: 1,
  decision: "approve",
  reason: "Application reviewed",
  notes: "Private note",
};
test("admin input rejects actor, owner, role, membership and forged protected fields", () => {
  assert.ok(parseAdminDecision(decision));
  for (const key of [
    "actorId",
    "ownerId",
    "role",
    "membership",
    "featuredEntitlement",
    "approval",
    "suspended",
  ])
    assert.equal(parseAdminDecision({ ...decision, [key]: "forged" }), null);
  for (const patch of [
    { version: 0 },
    { decisionVersion: 0 },
    { reason: "x" },
    { notes: "x".repeat(5001) },
    { decision: "activate" },
    { id: "bad" },
  ])
    assert.equal(parseAdminDecision({ ...decision, ...patch }), null);
});
test("admin and public DTO projections omit all fields outside their allowlists", () => {
  const admin = projectAdminWorkspace({
    ...adminWorkspace,
    secret: "outside",
    applications: adminWorkspace.applications.map((a) => ({
      ...a,
      ownerId: "private",
      billing: { id: "secret" },
    })),
  });
  assert.equal(JSON.stringify(admin).includes("ownerId"), false);
  assert.equal(admin.applications[0].internalNotes, "Private note");
  const publicData = projectPublicDirectory({
    catalog,
    profiles: [
      {
        id: decision.id,
        businessName: "Public business",
        publicDisplayName: "Public professional",
        contactName: "hidden",
        authMetadata: { name: "hidden" },
        city: "Raleigh",
        state: "NC",
        specialty: "",
        summary: "Public description",
        serviceArea: "",
        freeConsultation: false,
        featured: false,
        categoryIds: ["mold-inspection"],
        services: [],
        verifiedCredentials: [],
        listedCredentials: [],
        contact: { email: "", phone: "", website: "", privateEmail: "hidden" },
        internalNotes: "Private note",
        ownerId: "hidden",
        history: [{ reason: "hidden" }],
      },
    ],
  });
  assert.equal(publicData.profiles[0].publicDisplayName, "Public professional");
  const cleared = projectPublicDirectory({
    ...publicData,
    profiles: [
      {
        ...publicData.profiles[0],
        publicDisplayName: "",
        contactName: "hidden",
      },
    ],
  });
  assert.equal(cleared.profiles[0].publicDisplayName, "");
  assert.equal(JSON.stringify(cleared).includes("hidden"), false);
  assert.throws(
    () =>
      projectPublicDirectory({
        ...publicData,
        profiles: [{ ...publicData.profiles[0], publicDisplayName: undefined }],
      }),
    /temporarily unavailable/,
  );
  assert.equal(
    /privateEmail|internalNotes|ownerId|history|contactName|authMetadata|hidden/.test(
      JSON.stringify(publicData),
    ),
    false,
  );
});
test("admin HTTP denies anonymous, unconfirmed and metadata-forged members; responses are private", async (t) => {
  const { user, cookie } = setup(t);
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) =>
    String(input).includes("/auth/v1/user")
      ? Response.json(user)
      : Response.json(
          { code: "42501", message: "admin_required" },
          { status: 403 },
        ),
  );
  assert.equal((await handleAdminRequest(req("GET", null))).status, 401);
  const denied = await handleAdminRequest(req("GET", null, cookie));
  assert.equal(denied.status, 403);
  assert.match(denied.headers.get("cache-control") ?? "", /private.*no-store/);
  assert.equal(
    (await handleAdminRequest(req("POST", decision, cookie))).status,
    403,
  );
  assert.equal(
    (
      await handleAdminRequest(
        req("POST", decision, cookie, "https://evil.invalid"),
      )
    ).status,
    403,
  );
});
test("authorized admin operations validate versions, preserve caller JWT and reject stale/revoked decisions", async (t) => {
  const { user, cookie } = setup(t);
  let calls = 0;
  let failure = "";
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/auth/v1/user")) return Response.json(user);
      if (url.endsWith("/rhh_admin_workspace"))
        return Response.json(adminWorkspace);
      if (url.endsWith("/rhh_admin_decide")) {
        calls++;
        assert.match(
          new Headers(init?.headers).get("authorization") ?? "",
          /^Bearer /,
        );
        assert.deepEqual(JSON.parse(String(init?.body)), {
          target_id: decision.id,
          expected_profile_version: 1,
          expected_decision_version: 1,
          decision: "approve",
          reason: decision.reason,
          notes: decision.notes,
        });
        if (failure)
          return Response.json(
            {
              code: failure === "admin_required" ? "42501" : "40001",
              message: failure,
            },
            { status: 400 },
          );
        return Response.json(adminWorkspace);
      }
      throw Error("Unexpected request");
    },
  );
  assert.equal(
    (
      await handleAdminRequest(
        req("POST", { ...decision, role: "admin" }, cookie),
      )
    ).status,
    400,
  );
  assert.equal(calls, 0);
  assert.equal(
    (await handleAdminRequest(req("POST", decision, cookie))).status,
    200,
  );
  failure = "stale_decision";
  assert.equal(
    (await handleAdminRequest(req("POST", decision, cookie))).status,
    409,
  );
  failure = "admin_required";
  assert.equal(
    (await handleAdminRequest(req("POST", decision, cookie))).status,
    403,
  );
});

test("account landing resolves database admins, preserves members and fails closed on outages/revocation", async (t) => {
  setup(t);
  const { createRequestSupabaseClient } =
    await import("../../src/data/supabase/server");
  const { loadAccountWorkspace } =
    await import("../../src/data/supabase/account-workspace");
  const client = createRequestSupabaseClient({
    getAll: () => [],
    setAll: () => {},
  });
  let memberStatus = 403,
    adminStatus = 200,
    adminCalls = 0;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/rhh_member_workspace"))
      return memberStatus === 200
        ? Response.json(workspace)
        : Response.json(
            {
              code: memberStatus === 403 ? "42501" : "XX000",
              message: "denied",
            },
            { status: memberStatus },
          );
    adminCalls++;
    return adminStatus === 200
      ? Response.json(adminWorkspace)
      : Response.json(
          { code: "42501", message: "admin_required" },
          { status: adminStatus },
        );
  });
  assert.equal((await loadAccountWorkspace(client)).kind, "admin");
  memberStatus = 200;
  adminCalls = 0;
  assert.equal((await loadAccountWorkspace(client)).kind, "member");
  assert.equal(adminCalls, 0);
  memberStatus = 503;
  await assert.rejects(loadAccountWorkspace(client));
  assert.equal(adminCalls, 0);
  memberStatus = 403;
  adminStatus = 403;
  await assert.rejects(
    loadAccountWorkspace(client),
    /Member access is unavailable for this account/,
  );
});

test("account navigation uses validated identity and database authorization rather than metadata", async (t) => {
  const { user, cookie } = setup(t);
  const { createRequestSupabaseClient } =
    await import("../../src/data/supabase/server");
  const { loadAccountNavigation } =
    await import("../../src/data/supabase/account-workspace");
  const request = req("GET", null, cookie);
  const client = createRequestSupabaseClient({
    getAll: () => request.cookies.getAll(),
    setAll: () => {},
  });
  const anonymous = createRequestSupabaseClient({
    getAll: () => [],
    setAll: () => {},
  });
  let adminStatus = 403,
    confirmed = true;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/user"))
      return Response.json({
        ...user,
        email_confirmed_at: confirmed ? user.email_confirmed_at : null,
      });
    return adminStatus === 200
      ? Response.json(adminWorkspace)
      : Response.json(
          {
            code: adminStatus === 403 ? "42501" : "XX000",
            message: "unavailable",
          },
          { status: adminStatus },
        );
  });
  assert.equal(await loadAccountNavigation(anonymous), "anonymous");
  assert.equal(await loadAccountNavigation(client), "member"); // Metadata says admin, database denies it.
  adminStatus = 200;
  assert.equal(await loadAccountNavigation(client), "admin");
  adminStatus = 403;
  assert.equal(await loadAccountNavigation(client), "member");
  adminStatus = 503;
  assert.equal(await loadAccountNavigation(client), "unavailable");
  confirmed = false;
  assert.equal(await loadAccountNavigation(client), "anonymous");
});
