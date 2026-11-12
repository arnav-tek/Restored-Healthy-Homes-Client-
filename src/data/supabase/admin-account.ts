import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import type {
  AdminWorkspace,
  AdminDecisionInput,
} from "../../domain/admin-account";
import { adminDecisions } from "../../validation/admin-account";
import { isRecord } from "../../validation/member-account";
import { projectMemberWorkspace, MemberDataError } from "./member-account";
export function projectAdminWorkspace(value: unknown): AdminWorkspace {
  const invalid = (): never => {
    throw new MemberDataError(
      "unavailable",
      "Application records are temporarily unavailable.",
    );
  };
  if (!isRecord(value) || !Array.isArray(value.applications)) return invalid();
  const catalog = projectMemberWorkspace({
    catalog: value.catalog,
    application: null,
  }).catalog;
  return {
    catalog,
    applications: value.applications.map((raw) => {
      if (
        !isRecord(raw) ||
        !Number.isSafeInteger(raw.decisionVersion) ||
        Number(raw.decisionVersion) < 1 ||
        typeof raw.internalNotes !== "string" ||
        typeof raw.decisionReason !== "string" ||
        typeof raw.suspensionReason !== "string" ||
        typeof raw.submittedAt !== "string" ||
        !Array.isArray(raw.history)
      )
        return invalid();
      const application = projectMemberWorkspace({
        catalog,
        application: raw,
      }).application;
      if (!application) return invalid();
      return {
        ...application,
        decisionVersion: Number(raw.decisionVersion),
        internalNotes: raw.internalNotes,
        decisionReason: raw.decisionReason,
        suspensionReason: raw.suspensionReason,
        submittedAt: raw.submittedAt,
        history: raw.history.map((h) => {
          if (
            !isRecord(h) ||
            ![h.id, h.actorId, h.reason, h.internalNotes, h.decidedAt].every(
              (v) => typeof v === "string",
            ) ||
            !adminDecisions.includes(
              h.action as AdminDecisionInput["decision"],
            ) ||
            !Number.isSafeInteger(h.decisionVersion)
          )
            return invalid();
          return {
            id: String(h.id),
            actorId: String(h.actorId),
            reason: String(h.reason),
            internalNotes: String(h.internalNotes),
            decidedAt: String(h.decidedAt),
            action: h.action as AdminDecisionInput["decision"],
            decisionVersion: Number(h.decisionVersion),
          };
        }),
      };
    }),
  };
}
function fail(error: { code?: string; message: string }): never {
  if (error.code === "42501")
    throw new MemberDataError("denied", "Administrator access is required.");
  if (error.message === "stale_decision")
    throw new MemberDataError(
      "conflict",
      "This application changed after you opened it. Your draft is retained. Reload the saved record and review it before deciding again.",
    );
  if (
    ["invalid_decision", "invalid_transition", "application_missing"].includes(
      error.message,
    )
  )
    throw new MemberDataError(
      "invalid",
      "This decision is unavailable for the current application. Reload and review the saved record.",
    );
  throw new MemberDataError(
    "unavailable",
    "Application service is temporarily unavailable. Your draft is retained.",
  );
}
/** Authorization is repeated by the database on every call, including direct RPC requests. */
export async function loadAdminWorkspace(client: SupabaseClient<AuthDatabase>) {
  const { data, error } = await client.rpc("rhh_admin_workspace");
  if (error) fail(error);
  return projectAdminWorkspace(data);
}
export async function saveAdminDecision(
  client: SupabaseClient<AuthDatabase>,
  input: AdminDecisionInput,
) {
  const { data, error } = await client.rpc("rhh_admin_decide", {
    target_id: input.id,
    expected_profile_version: input.version,
    expected_decision_version: input.decisionVersion,
    decision: input.decision,
    reason: input.reason,
    notes: input.notes,
  });
  if (error) fail(error);
  return projectAdminWorkspace(data);
}
