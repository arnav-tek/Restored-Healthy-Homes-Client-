import type { MemberApplication, MemberWorkspace } from "./member-account";
export type AdminDecision = "approve" | "reject" | "suspend" | "reinstate";
export interface DecisionHistory {
  id: string;
  actorId: string;
  action: AdminDecision;
  reason: string;
  internalNotes: string;
  decidedAt: string;
  decisionVersion: number;
}
export interface AdminApplication extends MemberApplication {
  decisionVersion: number;
  decisionReason: string;
  suspensionReason: string;
  internalNotes: string;
  submittedAt: string;
  history: DecisionHistory[];
}
export interface AdminWorkspace {
  catalog: MemberWorkspace["catalog"];
  applications: AdminApplication[];
}
export interface AdminDecisionInput {
  id: string;
  version: number;
  decisionVersion: number;
  decision: AdminDecision;
  reason: string;
  notes: string;
}
