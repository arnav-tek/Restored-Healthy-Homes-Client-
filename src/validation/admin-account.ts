import { isRecord } from "./member-account";
import { parseReviewReason } from "./admin";
import type {
  AdminDecisionInput,
  AdminDecision,
} from "../domain/admin-account";
export const adminDecisions: readonly AdminDecision[] = [
  "approve",
  "reject",
  "suspend",
  "reinstate",
];
export function parseAdminDecision(raw: unknown): AdminDecisionInput | null {
  if (
    !isRecord(raw) ||
    Object.keys(raw).some(
      (k) =>
        ![
          "id",
          "version",
          "decisionVersion",
          "decision",
          "reason",
          "notes",
        ].includes(k),
    )
  )
    return null;
  const reason = parseReviewReason(raw.reason);
  if (
    typeof raw.id !== "string" ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(raw.id) ||
    !Number.isSafeInteger(raw.version) ||
    Number(raw.version) < 1 ||
    !Number.isSafeInteger(raw.decisionVersion) ||
    Number(raw.decisionVersion) < 1 ||
    !adminDecisions.includes(raw.decision as AdminDecision) ||
    !reason ||
    typeof raw.notes !== "string" ||
    raw.notes.length > 5000
  )
    return null;
  return {
    id: raw.id,
    version: Number(raw.version),
    decisionVersion: Number(raw.decisionVersion),
    decision: raw.decision as AdminDecision,
    reason,
    notes: raw.notes,
  };
}
