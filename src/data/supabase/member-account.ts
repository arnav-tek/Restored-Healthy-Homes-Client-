import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import type { MemberWorkspace } from "../../domain/member-account";
import type { MemberProfileFields } from "../../domain/demo-member";
import { isRecord } from "../../validation/member-account";
import { parseApplication } from "../../validation/application";

export class MemberDataError extends Error {
  constructor(
    public readonly kind: "conflict" | "invalid" | "denied" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}
function databaseError(error: { message: string; code?: string }): never {
  if (error.message === "application_exists")
    throw new MemberDataError(
      "conflict",
      "Your account already has an application. Your saved details were not replaced.",
    );
  if (error.message === "stale_profile")
    throw new MemberDataError(
      "conflict",
      "Your saved profile changed in another request. Your draft is still below; compare it with the saved profile before trying again.",
    );
  if (error.message === "invalid_profile")
    throw new MemberDataError(
      "invalid",
      "Check your profile fields and selected categories.",
    );
  if (error.code === "42501")
    throw new MemberDataError(
      "denied",
      "Member access is unavailable for this account.",
    );
  throw new MemberDataError(
    "unavailable",
    "Saved account data is temporarily unavailable. Your draft has not been cleared. Please try again later.",
  );
}
/** Re-project at the server boundary, even though SQL already returns an allowlist. */
export function projectMemberWorkspace(value: unknown): MemberWorkspace {
  const invalid = () => {
    throw new MemberDataError(
      "unavailable",
      "Saved account data is unavailable. Please try again later.",
    );
  };
  if (!isRecord(value) || !Array.isArray(value.catalog)) return invalid();
  const catalog = value.catalog.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      typeof item.active !== "boolean" ||
      !Number.isSafeInteger(item.monthlyUsd) ||
      Number(item.monthlyUsd) <= 0
    )
      return invalid();
    return {
      id: item.id,
      name: item.name,
      monthlyUsd: Number(item.monthlyUsd),
      active: item.active,
    };
  });
  if (value.application === null) return { catalog, application: null };
  const a = value.application;
  if (
    !isRecord(a) ||
    typeof a.id !== "string" ||
    !Number.isSafeInteger(a.version) ||
    Number(a.version) < 1 ||
    !["pending", "approved", "rejected"].includes(String(a.approval)) ||
    ![
      "active",
      "inactive",
      "past_due",
      "canceled",
      "trialing",
      "unpaid",
    ].includes(String(a.membership)) ||
    typeof a.suspended !== "boolean" ||
    !isRecord(a.profile) ||
    !Array.isArray(a.credentials)
  )
    return invalid();
  const p = a.profile;
  if (
    !Array.isArray(p.services) ||
    !Array.isArray(p.listedCredentials) ||
    ![...p.services, ...p.listedCredentials].every((v) => typeof v === "string")
  )
    return invalid();
  const parsed = parseApplication(
    {
      ...p,
      services: p.services.join("\n"),
      listedCredentials: p.listedCredentials.join("\n"),
    },
    catalog,
  );
  if (!parsed.ok) return invalid();
  const credentials = a.credentials.map((c) => {
    if (
      !isRecord(c) ||
      typeof c.name !== "string" ||
      (c.verification !== "verified" && c.verification !== "unverified")
    )
      return invalid();
    return {
      name: c.name,
      verification: c.verification as "verified" | "unverified",
    };
  });
  return {
    catalog,
    application: {
      id: a.id,
      version: Number(a.version),
      approval: a.approval as NonNullable<
        MemberWorkspace["application"]
      >["approval"],
      membership: a.membership as NonNullable<
        MemberWorkspace["application"]
      >["membership"],
      suspended: a.suspended,
      decisionReason: typeof a.decisionReason === "string" ? a.decisionReason : "",
      suspensionReason: typeof a.suspensionReason === "string" ? a.suspensionReason : "",
      profile: parsed.profile,
      credentials,
    },
  };
}
export async function loadMemberWorkspace(
  client: SupabaseClient<AuthDatabase>,
) {
  const { data, error } = await client.rpc("rhh_member_workspace");
  if (error) databaseError(error);
  return projectMemberWorkspace(data);
}
export async function saveMemberApplication(
  client: SupabaseClient<AuthDatabase>,
  profile: MemberProfileFields,
  version?: number,
) {
  const { data, error } =
    version === undefined
      ? await client.rpc("rhh_create_application", { profile })
      : await client.rpc("rhh_save_profile", {
          profile,
          expected_version: version,
        });
  if (error) databaseError(error);
  return projectMemberWorkspace(data);
}
