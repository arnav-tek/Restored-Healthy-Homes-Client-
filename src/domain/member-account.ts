import type { MemberProfileFields } from "./demo-member";
import type { ApprovalStatus, SubscriptionStatus } from "./professional";

/** Explicit member projection; no owner IDs, notes, billing IDs or reviewer fields. */
export interface MemberApplication {
  id: string;
  version: number;
  approval: ApprovalStatus;
  membership: SubscriptionStatus;
  suspended: boolean;
  decisionReason: string;
  suspensionReason: string;
  profile: MemberProfileFields;
  credentials: { name: string; verification: "unverified" | "verified" }[];
}
export interface MemberWorkspace {
  catalog: { id: string; name: string; monthlyUsd: number; active: boolean }[];
  application: MemberApplication | null;
}
