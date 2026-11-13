import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "../../src/data/supabase/database.types";
import { handleCredentials } from "../../src/data/media/credential-handler";
import {
  loadMemberCredentials,
  loadAdminCredentials,
  reviewCredential,
} from "../../src/data/supabase/credential-evidence";
import {
  parseMemberCredentials,
  parseAdminCredentials,
  parseCredentialDecision,
  parseEvidenceAssociation,
  parseEvidenceRoute,
} from "../../src/validation/credential-review";
const id = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const claim = {
  id,
  name: "Submitted test claim",
  verification: "unverified",
  state: "pending",
  version: 1,
  evidenceId: null,
  drafts: [],
};
test("credential projections exclude private routing/review fields from member data", () => {
  const parsed = parseMemberCredentials({
    claims: [
      {
        ...claim,
        ownerId: "PRIVATE",
        objectPath: "PRIVATE",
        reason: "PRIVATE",
        reviewer: "PRIVATE",
      },
    ],
  });
  assert.deepEqual(parsed, { claims: [claim] });
  assert.equal(JSON.stringify(parsed).includes("PRIVATE"), false);
  assert.equal(
    parseMemberCredentials({ claims: [{ ...claim, version: 0 }] }),
    null,
  );
  const admin = parseAdminCredentials({
    claims: [
      {
        ...claim,
        professionalId: other,
        businessName: "Test listing",
        archived: false,
        history: [
          {
            action: "reject",
            version: 2,
            claimName: claim.name,
            evidenceId: id,
            actorId: other,
            reason: "Private review reason",
            previousState: "pending",
            nextState: "rejected",
            at: "2026-11-13T00:00:00Z",
            objectPath: "PRIVATE",
          },
        ],
        email: "PRIVATE",
      },
    ],
    page: 1,
    hasNext: false,
  });
  assert.equal(admin?.claims[0].history[0].reason, "Private review reason");
  assert.equal(JSON.stringify(admin).includes("PRIVATE"), false);
});
test("evidence mutations reject forged ownership/reviewer fields, unsafe paths and missing optimistic versions", () => {
  const decision = {
    claimId: id,
    version: 1,
    evidenceId: other,
    action: "verify",
    reason: "Reviewed test scan",
  };
  assert.deepEqual(parseCredentialDecision(decision), decision);
  for (const k of ["ownerId", "reviewer", "reviewedAt", "verification", "role"])
    assert.equal(parseCredentialDecision({ ...decision, [k]: other }), null);
  assert.equal(parseCredentialDecision({ ...decision, reason: " " }), null);
  assert.equal(parseCredentialDecision({ ...decision, version: 0 }), null);
  assert.equal(parseEvidenceAssociation({ claimId: id, target: null }), null);
  assert.equal(
    parseEvidenceAssociation({
      claimId: id,
      target: other,
      version: 1,
      verification: "verified",
    }),
    null,
  );
  assert.deepEqual(
    parseEvidenceAssociation({ claimId: id, target: null, version: 1 }),
    { claimId: id, target: null, version: 1 },
  );
  assert.deepEqual(
    parseEvidenceRoute({ id, objectPath: `${other}/${other}/${id}.webp` }),
    { id, objectPath: `${other}/${other}/${id}.webp` },
  );
  for (const objectPath of [
    "../secret",
    `https://bad.invalid/${id}`,
    `${other}/${id}.webp`,
    `${other}/${other}/${other}.webp`,
    `${other}/../${id}.webp`,
  ])
    assert.equal(parseEvidenceRoute({ id, objectPath }), null);
});
test("anonymous credential reads/files/reviews and cross-site mutations fail before privileged Storage access", async (t) => {
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
  for (const admin of [false, true]) {
    for (const suffix of ["", `?file=${id}`]) {
      const response = await handleCredentials(
        new NextRequest(
          `http://127.0.0.1:3230/api/${admin ? "admin" : "member"}/credentials${suffix}`,
        ),
        admin,
      );
      assert.equal(response.status, 401);
      assert.match(response.headers.get("cache-control")!, /private.*no-store/);
      assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    }
    const denied = await handleCredentials(
      new NextRequest("http://127.0.0.1:3230/api/member/credentials", {
        method: "POST",
        headers: { origin: "https://evil.invalid" },
        body: "{}",
      }),
      admin,
    );
    assert.equal(denied.status, 403);
  }
  assert.equal(calls, 0);
});
test("credential adapters recheck database authorization and sanitize unavailable/denied responses", async () => {
  let calls = 0;
  const client = createClient<AuthDatabase>(
    "https://example.supabase.co",
    "sb_publishable_test",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async () => {
          calls++;
          return Response.json(
            { code: "42501", message: "SECRET_DIAGNOSTIC" },
            { status: 403 },
          );
        },
      },
    },
  );
  for (const op of [
    () => loadMemberCredentials(client),
    () => loadAdminCredentials(client),
    () =>
      reviewCredential(client, {
        claimId: id,
        version: 1,
        evidenceId: other,
        action: "verify",
        reason: "Test review reason",
      }),
  ]) {
    await assert.rejects(
      op,
      (error: unknown) =>
        error instanceof Error &&
        !error.message.includes("SECRET") &&
        error.message.includes("not permitted"),
    );
  }
  assert.equal(calls, 3);
});
