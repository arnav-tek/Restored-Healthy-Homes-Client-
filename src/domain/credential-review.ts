export type CredentialReviewState =
  "pending" | "verified" | "rejected" | "revoked";
export interface MemberCredential {
  id: string;
  name: string;
  verification: "unverified" | "verified";
  state: CredentialReviewState;
  version: number;
  evidenceId: string | null;
  drafts: string[];
}
export interface MemberCredentials {
  claims: MemberCredential[];
}
export interface CredentialReviewEvent {
  action: "verify" | "reject" | "revoke" | "evidence_changed" | "claim_changed";
  version: number;
  claimName: string;
  evidenceId: string | null;
  actorId: string | null;
  reason: string;
  previousState: CredentialReviewState;
  nextState: CredentialReviewState;
  at: string;
}
export interface AdminCredential extends MemberCredential {
  professionalId: string;
  businessName: string;
  archived: boolean;
  history: CredentialReviewEvent[];
}
export interface AdminCredentials {
  page: number;
  hasNext: boolean;
  claims: AdminCredential[];
}
export interface CredentialDecision {
  claimId: string;
  version: number;
  evidenceId: string | null;
  action: "verify" | "reject" | "revoke";
  reason: string;
}
