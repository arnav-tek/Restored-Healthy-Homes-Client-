import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { NextRequest, type NextResponse } from "next/server";
import {
  handleAuthPost,
  handleAuthCallback,
} from "../../src/data/supabase/auth-handlers";
import {
  recoveryCookie,
  recoveryGrant,
  validRecoveryGrant,
} from "../../src/data/supabase/auth-config";
import { safeAuthReturn, validateAuth } from "../../src/validation/auth";
import { authenticatedIdentity } from "../../src/data/supabase/auth";
import { createRequestSupabaseClient } from "../../src/data/supabase/server";
import { proxy } from "../../src/proxy";
const origin = "http://127.0.0.1:3230";
const user = {
  id: "designated-test",
  aud: "authenticated",
  email: "test@example.invalid",
  email_confirmed_at: "2026-11-08T00:00:00Z",
  app_metadata: {},
  user_metadata: { role: "admin" },
  created_at: "2026-11-08T00:00:00Z",
};
const fields = {
  email: user.email,
  password: "Test-only-2026",
  confirm: "Test-only-2026",
};
function setup(t: TestContext) {
  const old = { ...process.env };
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_ORIGIN: origin,
    RHH_AUTH_COOKIE_SECRET: "test-only-secret-000000000000000000000",
  });
  delete process.env.VERCEL_ENV;
  t.after(() => {
    process.env = old;
  });
}
function session(confirmed = true) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token =
    [
      { alg: "HS256", typ: "JWT" },
      { sub: user.id, exp, iat: exp - 3600, aud: "authenticated" },
    ]
      .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url"))
      .join(".") + ".c2lnbmF0dXJl";
  return {
    access_token: token,
    refresh_token: "test-refresh",
    expires_in: 3600,
    expires_at: exp,
    token_type: "bearer",
    user: {
      ...user,
      email_confirmed_at: confirmed ? user.email_confirmed_at : undefined,
    },
  };
}
function cookies(response: NextResponse) {
  return response.cookies
    .getAll()
    .filter((c) => c.value)
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}
function post(
  action: string,
  body: unknown = fields,
  cookie = "",
  requestOrigin = origin,
) {
  return new NextRequest(`${origin}/api/auth/${action}`, {
    method: "POST",
    headers: {
      origin: requestOrigin,
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify(body),
  });
}
function transport(
  t: TestContext,
  handler: (url: string, init?: RequestInit) => Response,
) {
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) =>
      handler(String(input), init),
  );
}

test("approved returns exclude external, encoded and malformed redirects", () => {
  for (const unsafe of [
    "https://evil.invalid",
    "//evil.invalid",
    "/\\evil.invalid",
    "/%2f%2fevil.invalid",
    "/member?next=https://evil.invalid",
    "/member#x",
    "/demo/admin",
    null,
  ])
    assert.equal(safeAuthReturn(unsafe), "/member");
  assert.equal(safeAuthReturn("/member/profile"), "/member/profile");
  assert.equal(safeAuthReturn("/admin"), "/admin");
  assert.ok(
    validateAuth("signup", {
      email: "bad",
      password: "short",
      confirm: "other",
    }).email,
  );
});
test("Auth mutations reject cross-origin, malformed and oversized input before provider calls", async (t) => {
  setup(t);
  transport(t, () => {
    throw new Error("Unexpected provider request");
  });
  assert.equal(
    (
      await handleAuthPost(
        post("login", fields, "", "https://evil.invalid"),
        "login",
      )
    ).status,
    403,
  );
  assert.equal(
    (await handleAuthPost(post("signup", { email: "bad" }), "signup")).status,
    400,
  );
  assert.equal(
    (await handleAuthPost(post("login", { email: "x".repeat(5000) }), "login"))
      .status,
    413,
  );
});
test("signup preserves PKCE verifier and callback only redirects locally after verified Auth", async (t) => {
  setup(t);
  let used = false;
  transport(t, (url, init) => {
    if (url.includes("/signup")) {
      assert.equal(JSON.parse(String(init?.body)).email, fields.email);
      return Response.json({ ...user, email_confirmed_at: undefined });
    }
    if (url.includes("grant_type=pkce")) {
      if (used)
        return Response.json(
          { code: "flow_state_not_found", msg: "used" },
          { status: 400 },
        );
      used = true;
      assert.ok(JSON.parse(String(init?.body)).code_verifier);
      return Response.json(session());
    }
    if (url.endsWith("/user")) return Response.json(user);
    throw new Error("Unexpected endpoint");
  });
  const signup = await handleAuthPost(post("signup"), "signup");
  assert.equal(signup.status, 200);
  assert.deepEqual(await signup.json(), { redirect: "/check-email" });
  assert.equal(
    (await proxy(new NextRequest(`${origin}/check-email`))).status,
    200,
  );
  assert.match(cookies(signup), /code-verifier/);
  const request = new NextRequest(
    `${origin}/auth/callback?code=synthetic&next=https://evil.invalid`,
    { headers: { cookie: cookies(signup) } },
  );
  const callback = await handleAuthCallback(request);
  assert.equal(callback.headers.get("location"), `${origin}/member`);
  assert.match(cookies(callback), /auth-token/);
  assert.match(callback.headers.get("cache-control")!, /no-store/);
  const reused = await handleAuthCallback(request);
  assert.equal(
    reused.headers.get("location"),
    `${origin}/login?notice=link-invalid`,
  );
});
test("wrong password and unconfirmed Auth identity do not create member access", async (t) => {
  setup(t);
  transport(t, () =>
    Response.json(
      { code: "invalid_credentials", msg: "invalid" },
      { status: 400 },
    ),
  );
  assert.equal((await handleAuthPost(post("login"), "login")).status, 401);
  t.mock.restoreAll();
  transport(t, (url) =>
    url.includes("grant_type=password")
      ? Response.json(session(false))
      : url.endsWith("/user")
        ? Response.json({ ...user, email_confirmed_at: undefined })
        : new Response(null, { status: 204 }),
  );
  assert.equal((await handleAuthPost(post("login"), "login")).status, 401);
});
test("login cookie persists across new requests and logout removes session cookies", async (t) => {
  setup(t);
  transport(t, (url) =>
    url.includes("grant_type=password")
      ? Response.json(session())
      : url.endsWith("/user")
        ? Response.json(user)
        : new Response(null, { status: 204 }),
  );
  const login = await handleAuthPost(
    post("login", { ...fields, returnTo: "//evil.invalid" }),
    "login",
  );
  assert.deepEqual(await login.json(), { redirect: "/member" });
  const jar = login.cookies.getAll();
  const client = createRequestSupabaseClient({
    getAll: () => jar,
    setAll: () => {},
  });
  assert.deepEqual(await authenticatedIdentity(client), { id: user.id });
  const logout = await handleAuthPost(
    post("logout", {}, cookies(login)),
    "logout",
  );
  assert.equal(logout.status, 200);
  assert.ok(
    logout.cookies
      .getAll()
      .some((c) => c.name.includes("auth-token") && !c.value),
  );
  assert.equal(
    await authenticatedIdentity(
      createRequestSupabaseClient({ getAll: () => [], setAll: () => {} }),
    ),
    null,
  );
  assert.equal((await proxy(new NextRequest(`${origin}/admin`))).status, 200); // Route and RPC enforce the protected role.
});
test("recovery responses do not reveal account existence or delivery availability", async (t) => {
  setup(t);
  let status = 200;
  transport(t, () =>
    Response.json(
      status === 200
        ? {}
        : { code: "email_address_not_authorized", msg: "restricted" },
      { status },
    ),
  );
  const first = await handleAuthPost(
    post("forgot", { email: user.email }),
    "forgot",
  );
  const body = await first.json();
  status = 400;
  const second = await handleAuthPost(
    post("forgot", { email: "unknown@example.invalid" }),
    "forgot",
  );
  assert.equal(second.status, first.status);
  assert.deepEqual(await second.json(), body);
});
test("recovery callback, reset and expiration enforce verified identity and signed grant", async (t) => {
  setup(t);
  let updated = false;
  transport(t, (url, init) => {
    if (url.includes("/recover")) return Response.json({});
    if (url.includes("grant_type=pkce")) return Response.json(session());
    if (url.endsWith("/user")) {
      if (init?.method === "PUT") updated = true;
      return Response.json(user);
    }
    return new Response(null, { status: 204 });
  });
  const begin = await handleAuthPost(
    post("forgot", { email: user.email }),
    "forgot",
  );
  const callback = await handleAuthCallback(
    new NextRequest(`${origin}/auth/recovery?code=synthetic`, {
      headers: { cookie: cookies(begin) },
    }),
    true,
  );
  assert.equal(callback.headers.get("location"), `${origin}/reset-password`);
  const grant = callback.cookies.get(recoveryCookie);
  assert.ok(grant?.httpOnly);
  assert.equal(validRecoveryGrant(grant?.value, "another-user"), false);
  assert.equal(validRecoveryGrant(recoveryGrant(user.id, 0), user.id), false);
  const reset = await handleAuthPost(
    post("reset", fields, cookies(callback)),
    "reset",
  );
  assert.equal(reset.status, 200);
  assert.equal(updated, true);
  assert.equal(reset.cookies.get(recoveryCookie)?.value, "");
  assert.equal(
    (await handleAuthPost(post("reset", fields), "reset")).status,
    401,
  );
  const expired = await handleAuthCallback(
    new NextRequest(
      `${origin}/auth/recovery?error=access_denied&error_description=secret`,
    ),
    true,
  );
  assert.equal(
    expired.headers.get("location"),
    `${origin}/login?notice=link-invalid`,
  );
});

test("HTTPS Auth cookies are secure; local HTTP remains usable", async (t) => {
  setup(t);
  transport(t, (url) =>
    url.includes("grant_type=password")
      ? Response.json(session())
      : Response.json(user),
  );
  for (const secure of [false, true]) {
    const authOrigin = secure ? "https://staging.example.invalid" : origin;
    process.env.RHH_AUTH_ORIGIN = authOrigin;
    const response = await handleAuthPost(
      post("login", fields, "", authOrigin),
      "login",
    );
    assert.equal(response.status, 200);
    const authCookie = response.cookies
      .getAll()
      .find((c) => c.name.includes("auth-token"));
    assert.ok(authCookie);
    assert.equal(Boolean(authCookie.secure), secure);
    assert.equal(authCookie.sameSite, "lax");
  }
});

test("signup verification cannot create a recovery grant; reused PKCE codes fail closed", async (t) => {
  setup(t);
  let exchanges = 0;
  transport(t, (url) => {
    if (url.includes("/signup")) return Response.json({ user });
    if (url.includes("grant_type=pkce")) {
      exchanges++;
      return exchanges === 1
        ? Response.json(session())
        : Response.json(
            { code: "flow_state_not_found", message: "Expired or reused code" },
            { status: 400 },
          );
    }
    if (url.endsWith("/user")) return Response.json(user);
    return new Response(null, { status: 204 });
  });
  const signup = await handleAuthPost(post("signup"), "signup");
  const request = () =>
    new NextRequest(
      `${origin}/auth/recovery?code=synthetic&returnTo=https://evil.invalid`,
      { headers: { cookie: cookies(signup) } },
    );
  for (let i = 0; i < 2; i++) {
    const result = await handleAuthCallback(request(), true);
    assert.equal(
      result.headers.get("location"),
      `${origin}/login?notice=link-invalid`,
    );
    assert.equal(result.cookies.get(recoveryCookie), undefined);
    assert.match(
      result.headers.get("cache-control") ?? "",
      /private.*no-store/,
    );
  }
});

test("new passwords enforce 8-16 characters without blocking existing longer sign-ins", async (t) => {
  setup(t);
  let providerCalls = 0;
  transport(t, (url) => {
    assert.ok(url.includes("/signup"));
    providerCalls++;
    return Response.json({ user });
  });
  for (const action of ["signup", "reset"] as const) {
    for (const length of [0, 7, 17, 128]) {
      const password = "x".repeat(length);
      assert.equal(
        validateAuth(action, { ...fields, password, confirm: password })
          .password,
        "Use 8–16 characters for your password.",
      );
      const response = await handleAuthPost(
        post(action, { ...fields, password, confirm: password }),
        action,
      );
      assert.equal(response.status, 400);
    }
    for (const length of [8, 16]) {
      const password = "x".repeat(length);
      assert.equal(
        validateAuth(action, { ...fields, password, confirm: password })
          .password,
        undefined,
      );
    }
  }
  assert.equal(providerCalls, 0);
  for (const length of [8, 16]) {
    const password = "x".repeat(length);
    assert.equal(
      (
        await handleAuthPost(
          post("signup", { ...fields, password, confirm: password }),
          "signup",
        )
      ).status,
      200,
    );
  }
  assert.equal(providerCalls, 2);
  assert.equal(
    validateAuth("signup", {
      ...fields,
      password: "12345678",
      confirm: "different",
    }).confirm,
    "Passwords must match.",
  );
  assert.equal(
    validateAuth("login", {
      ...fields,
      password: "Existing-long-password-2026",
    }).password,
    undefined,
  );
});

test("failed signup stays on the form instead of claiming email confirmation is pending", async (t) => {
  setup(t);
  transport(t, () =>
    Response.json(
      { code: "over_email_send_rate_limit", message: "Try later" },
      { status: 429 },
    ),
  );
  const response = await handleAuthPost(post("signup"), "signup");
  assert.equal(response.status, 400);
  assert.equal((await response.json()).redirect, undefined);
});
