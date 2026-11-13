import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import {
  applicationMode,
  stagingConfiguration,
  assertDemoConfiguration,
} from "../../src/domain/config";
import { createRequestSupabaseClient } from "../../src/data/supabase/server";
import { authenticatedIdentity } from "../../src/data/supabase/auth";
import { refreshStagingSession } from "../../src/data/supabase/proxy";
import { proxy } from "../../src/proxy";
import { GET } from "../../src/app/api/auth/session/route";

const config = {
  RHH_APP_MODE: "staging",
  NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
};
const cookieName = "sb-xjecnuebalmmblowmtks-auth-token";
const user = {
  email_confirmed_at: "2026-11-08T00:00:00Z",
  id: "verified-server-user",
  aud: "authenticated",
  role: "authenticated",
  email: "synthetic@example.invalid",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-11-08T00:00:00Z",
};
function token(exp: number) {
  return (
    [
      { alg: "HS256", typ: "JWT" },
      {
        sub: user.id,
        exp,
        iat: exp - 3600,
        aud: "authenticated",
        iss: `${config.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`,
      },
    ]
      .map((part) => Buffer.from(JSON.stringify(part)).toString("base64url"))
      .join(".") + ".c2lnbmF0dXJl"
  );
}
function session(exp: number) {
  return {
    access_token: token(exp),
    refresh_token: "synthetic-refresh",
    expires_at: exp,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      ...user,
      id: "forged-cookie-user",
      user_metadata: { role: "admin" },
    },
  };
}
function cookie(exp: number) {
  return {
    name: cookieName,
    value:
      "base64-" +
      Buffer.from(JSON.stringify(session(exp))).toString("base64url"),
  };
}
function setup(t: TestContext) {
  const old = { ...process.env };
  Object.assign(process.env, config);
  delete process.env.VERCEL_ENV;
  t.after(() => {
    process.env = old;
  });
}

test("staging config rejects missing keys, other projects, privileged keys and public launch", () => {
  assert.equal(applicationMode(config), "staging");
  for (const override of [
    { NEXT_PUBLIC_SUPABASE_URL: undefined },
    { NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co" },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_do_not_accept" },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "eyJservice_role" },
    { VERCEL_ENV: "production" },
    { RHH_APP_MODE: "live" },
  ]) {
    assert.throws(() => applicationMode({ ...config, ...override }));
  }
  assert.throws(() => applicationMode({ NODE_ENV: "production" }));
  assert.throws(() => assertDemoConfiguration(config));
  assert.throws(() => stagingConfiguration({}));
});

test("anonymous session is null, uncached and does not need a remote request", async (t) => {
  setup(t);
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected network request");
  });
  const client = createRequestSupabaseClient({
    getAll: () => [],
    setAll: () => {},
  });
  assert.equal(await authenticatedIdentity(client), null);
  const response = await GET(
    new NextRequest("http://localhost/api/auth/session"),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    authenticated: false,
    identity: null,
  });
  assert.match(response.headers.get("cache-control")!, /private.*no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
});

test("server identity comes from Auth, never the cookie user or metadata role", async (t) => {
  setup(t);
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      assert.match(String(input), /\/auth\/v1\/user$/);
      assert.equal(init?.cache, "no-store");
      calls++;
      return Response.json(user);
    },
  );
  const client = createRequestSupabaseClient({
    getAll: () => [cookie(Date.now() / 1000 + 3600)],
    setAll: () => {},
  });
  assert.deepEqual(await authenticatedIdentity(client), { id: user.id });
  assert.equal(calls, 1);
});

test("invalid cookies cannot authorize and Auth outages fail closed", async (t) => {
  setup(t);
  const currentCookie = cookie(Date.now() / 1000 + 3600);
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ code: "bad_jwt", msg: "invalid" }, { status: 401 }),
  );
  assert.equal(
    await authenticatedIdentity(
      createRequestSupabaseClient({
        getAll: () => [currentCookie],
        setAll: () => {},
      }),
    ),
    null,
  );
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { code: "unexpected_failure", msg: "unavailable" },
      { status: 500 },
    ),
  );
  await assert.rejects(
    authenticatedIdentity(
      createRequestSupabaseClient({
        getAll: () => [currentCookie],
        setAll: () => {},
      }),
    ),
    /unavailable/,
  );
});

test("expired session refresh forwards new cookies to browser and downstream server", async (t) => {
  setup(t);
  const now = Math.floor(Date.now() / 1000);
  const oldCookie = cookie(now - 30);
  const fresh = { ...session(now + 3600), user };
  let refreshed = 0;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    if (String(input).includes("/token?grant_type=refresh_token")) {
      refreshed++;
      return Response.json(fresh);
    }
    if (String(input).endsWith("/user")) return Response.json(user);
    throw new Error("Unexpected Auth endpoint");
  });
  const request = new NextRequest("http://localhost/api/auth/session", {
    headers: { cookie: `${oldCookie.name}=${oldCookie.value}` },
  });
  const response = await refreshStagingSession(request);
  assert.equal(refreshed, 1);
  assert.notEqual(request.cookies.get(cookieName)?.value, oldCookie.value);
  assert.equal(
    response.cookies.get(cookieName)?.value,
    request.cookies.get(cookieName)?.value,
  );
  assert.match(
    response.headers.get("x-middleware-request-cookie")!,
    new RegExp(cookieName),
  );
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.equal(response.headers.get("expires"), "0");
  assert.equal(response.headers.get("vercel-cdn-cache-control"), "no-store");
  // A different request must not inherit the first request's cookies or identity.
  assert.equal(
    await authenticatedIdentity(
      createRequestSupabaseClient({ getAll: () => [], setAll: () => {} }),
    ),
    null,
  );
});

test("connected routes and repositories never fall back to demo records", async (t) => {
  setup(t);
  const response = await proxy(
    new NextRequest("http://localhost/consultations"),
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("x-middleware-rewrite")!, /availability/);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  const {
    directoryRepository,
    reviewRepository,
    qaRepository,
    locationAdapter,
  } = await import("../../src/data/index");
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: "Unavailable" }, { status: 503 }),
  );
  await assert.rejects(
    directoryRepository.listPublic(),
    /temporarily unavailable/,
  );
  await assert.rejects(reviewRepository.publicSnapshot(), /not implemented/);
  await assert.rejects(qaRepository.listPublic(), /temporarily unavailable/);
  await assert.rejects(locationAdapter.listSupported(), /not implemented/);
});

test("demo session endpoint is disabled and does not contact Supabase", async (t) => {
  setup(t);
  process.env.RHH_APP_MODE = "demo";
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected network request");
  });
  assert.equal(
    (await GET(new NextRequest("http://localhost/api/auth/session"))).status,
    404,
  );
  const response = await proxy(new NextRequest("http://localhost/member"));
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.throws(
    () => createRequestSupabaseClient({ getAll: () => [] }),
    /requires/,
  );
});

test("expired sessions with revoked refresh tokens clear cookies and stay anonymous", async (t) => {
  setup(t);
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { code: "refresh_token_not_found", message: "Refresh token revoked" },
      { status: 400 },
    ),
  );
  const old = cookie(Math.floor(Date.now() / 1000) - 30);
  const request = new NextRequest("http://localhost/api/auth/session", {
    headers: { cookie: `${old.name}=${old.value}` },
  });
  const response = await refreshStagingSession(request);
  assert.ok(
    response.cookies
      .getAll()
      .some((c) => c.name.includes("auth-token") && !c.value),
  );
  assert.equal(
    await authenticatedIdentity(
      createRequestSupabaseClient({
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      }),
    ),
    null,
  );
  assert.match(
    response.headers.get("cache-control") ?? "",
    /private.*no-store/,
  );
});
