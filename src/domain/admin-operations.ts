export const featuredViews = ["selected", "eligible", "entitled"] as const;
export type FeaturedView = (typeof featuredViews)[number];
export const approvalStates = ["pending", "approved", "rejected"] as const;
export const reportMembershipStates = [
  "active",
  "inactive",
  "past_due",
  "canceled",
  "trialing",
  "unpaid",
  "missing",
] as const;
export type ReportMembershipState = (typeof reportMembershipStates)[number];
export interface FeaturedItem {
  id: string;
  businessName: string;
  approval: (typeof approvalStates)[number];
  membership: Exclude<ReportMembershipState, "missing"> | null;
  suspended: boolean;
  entitlement: "none" | "active";
  selected: boolean;
  version: number;
  eligible: boolean;
  visible: boolean;
}
export interface FeaturedChange {
  id: string;
  professionalId: string;
  actorId: string;
  selected: boolean;
  version: number;
  reason: string;
  at: string;
}
export interface FeaturedWorkspace {
  kind: "featured";
  page: number;
  view: FeaturedView;
  total: number;
  items: FeaturedItem[];
  history: FeaturedChange[];
}
export interface OperationsReport {
  kind: "report";
  asOf: string;
  month: string;
  page: number;
  total: number;
  eligible: number;
  undated: number;
  applicationStatuses: Record<(typeof approvalStates)[number], number>;
  membershipStates: Record<ReportMembershipState, number>;
  featured: {
    selected: number;
    visibleEditorial: number;
    entitled: number;
    visibleEntitled: number;
    visible: number;
  };
  categories: {
    id: string;
    name: string;
    active: boolean;
    total: number;
    activeMemberships: number;
    eligible: number;
  }[];
  months: { month: string; count: number }[];
  items: {
    id: string;
    businessName: string;
    approval: FeaturedItem["approval"];
    membership: FeaturedItem["membership"];
    suspended: boolean;
    submittedAt: string | null;
  }[];
}
