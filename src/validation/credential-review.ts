import type {
  MemberCredentials,
  MemberCredential,
  AdminCredentials,
  AdminCredential,
  CredentialReviewEvent,
  CredentialReviewState,
  CredentialDecision,
} from "../domain/credential-review";
import { isRecord } from "./member-account";
import { inquiryUuid } from "./connected-inquiry";
import { parseReviewReason } from "./admin";
export const credentialId = (v: unknown): v is string =>
  typeof v === "string" && inquiryUuid.test(v);
const state = (v: unknown): v is CredentialReviewState =>
  ["pending", "verified", "rejected", "revoked"].includes(String(v));
function claim(raw: unknown): MemberCredential | null {
  if (
    !isRecord(raw) ||
    !credentialId(raw.id) ||
    typeof raw.name !== "string" ||
    !["verified", "unverified"].includes(String(raw.verification)) ||
    !state(raw.state) ||
    !Number.isSafeInteger(raw.version) ||
    Number(raw.version) < 1 ||
    (raw.evidenceId !== null && !credentialId(raw.evidenceId))
  )
    return null;
  const drafts =
    Array.isArray(raw.drafts) && raw.drafts.every(credentialId)
      ? [...raw.drafts]
      : [];
  return {
    id: raw.id,
    name: raw.name,
    verification: raw.verification as MemberCredential["verification"],
    state: raw.state,
    version: Number(raw.version),
    evidenceId: raw.evidenceId as string | null,
    drafts,
  };
}
export function parseMemberCredentials(raw: unknown): MemberCredentials | null {
  if (!isRecord(raw) || !Array.isArray(raw.claims)) return null;
  const claims = [];
  for (const row of raw.claims) {
    const c = claim(row);
    if (!c) return null;
    claims.push(c);
  }
  return { claims };
}
export function parseAdminCredentials(raw: unknown): AdminCredentials | null {
  if (
    !isRecord(raw) ||
    !Array.isArray(raw.claims) ||
    !Number.isSafeInteger(raw.page) ||
    Number(raw.page) < 1 ||
    typeof raw.hasNext !== "boolean"
  )
    return null;
  const claims: AdminCredential[] = [];
  for (const row of raw.claims) {
    const c = claim(row);
    if (
      !c ||
      !isRecord(row) ||
      !credentialId(row.professionalId) ||
      typeof row.businessName !== "string" ||
      typeof row.archived !== "boolean" ||
      !Array.isArray(row.history)
    )
      return null;
    const history: CredentialReviewEvent[] = [];
    for (const h of row.history) {
      if (
        !isRecord(h) ||
        ![
          "verify",
          "reject",
          "revoke",
          "evidence_changed",
          "claim_changed",
        ].includes(String(h.action)) ||
        !Number.isSafeInteger(h.version) ||
        Number(h.version) < 1 ||
        typeof h.claimName !== "string" ||
        (h.evidenceId !== null && !credentialId(h.evidenceId)) ||
        (h.actorId !== null && !credentialId(h.actorId)) ||
        typeof h.reason !== "string" ||
        !state(h.previousState) ||
        !state(h.nextState) ||
        typeof h.at !== "string" ||
        !Number.isFinite(Date.parse(h.at))
      )
        return null;
      history.push({
        action: h.action as CredentialReviewEvent["action"],
        version: Number(h.version),
        claimName: h.claimName,
        evidenceId: h.evidenceId as string | null,
        actorId: h.actorId as string | null,
        reason: h.reason,
        previousState: h.previousState,
        nextState: h.nextState,
        at: h.at,
      });
    }
    claims.push({
      ...c,
      professionalId: row.professionalId,
      businessName: row.businessName,
      archived: row.archived,
      history,
    });
  }
  return { claims, page: Number(raw.page), hasNext: raw.hasNext };
}
export function parseCredentialDecision(
  raw: unknown,
): CredentialDecision | null {
  if (
    !isRecord(raw) ||
    Object.keys(raw).length !== 5 ||
    !Object.keys(raw).every((k) =>
      ["claimId", "version", "evidenceId", "action", "reason"].includes(k),
    ) ||
    !credentialId(raw.claimId) ||
    !Number.isSafeInteger(raw.version) ||
    Number(raw.version) < 1 ||
    (raw.evidenceId !== null && !credentialId(raw.evidenceId)) ||
    !["verify", "reject", "revoke"].includes(String(raw.action))
  )
    return null;
  const reason = parseReviewReason(raw.reason);
  return reason
    ? {
        claimId: raw.claimId,
        version: Number(raw.version),
        evidenceId: raw.evidenceId as string | null,
        action: raw.action as CredentialDecision["action"],
        reason,
      }
    : null;
}
export function parseEvidenceAssociation(raw: unknown) {
  if (
    !isRecord(raw) ||
    Object.keys(raw).length !== 3 ||
    !Object.keys(raw).every((k) =>
      ["claimId", "target", "version"].includes(k),
    ) ||
    !credentialId(raw.claimId) ||
    (raw.target !== null && !credentialId(raw.target)) ||
    !Number.isSafeInteger(raw.version) ||
    Number(raw.version) < 1
  )
    return null;
  return {
    claimId: raw.claimId,
    target: raw.target as string | null,
    version: Number(raw.version),
  };
}
export function parseEvidenceRoute(raw: unknown) {
  if (
    !isRecord(raw) ||
    !credentialId(raw.id) ||
    typeof raw.objectPath !== "string"
  )
    return null;
  const parts = raw.objectPath.split("/");
  return parts.length === 3 &&
    credentialId(parts[0]) &&
    credentialId(parts[1]) &&
    parts[2] === `${raw.id}.webp`
    ? { id: raw.id, objectPath: raw.objectPath }
    : null;
}
