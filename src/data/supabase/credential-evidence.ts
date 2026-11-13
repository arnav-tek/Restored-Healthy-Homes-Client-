import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import type { CredentialDecision } from "../../domain/credential-review";
import {
  parseMemberCredentials,
  parseAdminCredentials,
  parseEvidenceRoute,
} from "../../validation/credential-review";
import { isRecord } from "../../validation/member-account";
import { credentialEvidenceStorage } from "../media/storage";
export class CredentialDataError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function check(error: { code?: string } | null) {
  if (!error) return;
  const status =
    (
      {
        PT404: 404,
        PT409: 409,
        PT429: 429,
        "42501": 403,
        "22023": 400,
      } as Record<string, number>
    )[error.code ?? ""] ?? 503;
  throw new CredentialDataError(
    status,
    status === 409
      ? "The claim or evidence changed, or this review transition is unavailable. Your draft is retained; compare the latest saved state before retrying."
      : status === 403
        ? "Credential access is not permitted for this account."
        : status === 429
          ? "Evidence limit reached. Discard unused drafts and allow the cleanup safety delay, or ask an administrator about retained evidence. The daily upload limit may also apply."
          : status === 404
            ? "This claim or evidence is unavailable."
            : "Credential operations are unavailable. Saving has not been confirmed.",
  );
}
export async function memberCredentials(
  client: SupabaseClient<AuthDatabase>,
  payload: Record<string, unknown> = { action: "get" },
) {
  const { data, error } = await client.rpc("rhh_member_credentials", {
    payload,
  });
  check(error);
  return data;
}
export async function loadMemberCredentials(
  client: SupabaseClient<AuthDatabase>,
) {
  const parsed = parseMemberCredentials(await memberCredentials(client));
  if (!parsed)
    throw new CredentialDataError(503, "Credential status is unavailable.");
  return parsed;
}
export async function loadAdminCredentials(
  client: SupabaseClient<AuthDatabase>,
  page = 1,
) {
  const { data, error } = await client.rpc("rhh_admin_credentials", {
    page_number: page,
  });
  check(error);
  const parsed = parseAdminCredentials(data);
  if (!parsed)
    throw new CredentialDataError(503, "Credential reviews are unavailable.");
  return parsed;
}
export async function reviewCredential(
  client: SupabaseClient<AuthDatabase>,
  payload: CredentialDecision,
) {
  const { data, error } = await client.rpc("rhh_review_credential", {
    payload,
  });
  check(error);
  if (
    !isRecord(data) ||
    data.saved !== true ||
    !Number.isSafeInteger(data.version) ||
    !["verified", "rejected", "revoked"].includes(String(data.state))
  )
    throw new CredentialDataError(
      503,
      "Review could not be confirmed. Reload the history before retrying.",
    );
  return {
    saved: true,
    version: Number(data.version),
    state: String(data.state),
  };
}
export async function evidenceRoute(
  client: SupabaseClient<AuthDatabase>,
  target: string,
  admin = false,
) {
  const { data, error } = await client.rpc("rhh_credential_file", {
    target,
    admin_mode: admin,
  });
  check(error);
  return parseEvidenceRoute(data);
}
export async function cleanupCredentialDrafts(
  client: SupabaseClient<AuthDatabase>,
) {
  let pending = false;
  try {
    const raw = await memberCredentials(client, { action: "cleanup" });
    if (!Array.isArray(raw)) return true;
    for (const row of raw) {
      const route = parseEvidenceRoute(row);
      if (!route) {
        pending = true;
        continue;
      }
      try {
        await credentialEvidenceStorage().remove(route.objectPath);
        await memberCredentials(client, { action: "ack", target: route.id });
      } catch {
        pending = true;
      }
    }
  } catch {
    pending = true;
  }
  return pending;
}
