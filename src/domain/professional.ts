export type ApprovalStatus = "pending" | "approved" | "rejected";
export type SubscriptionStatus =
  "active" | "inactive" | "past_due" | "canceled" | "trialing" | "unpaid";
export interface Credential {
  name: string;
  verification: "unverified" | "verified";
}
export interface ProfessionalRecord {
  id: string;
  businessName: string;
  categoryIds: string[];
  city: string;
  state: string;
  specialty: string;
  summary: string;
  services: string[];
  credentials: Credential[];
  freeConsultation?: boolean;
  serviceArea?: string;
  publicContact?: { email?: string; phone?: string; website?: string };
  approval: ApprovalStatus;
  subscription: SubscriptionStatus;
  suspended: boolean;
  featuredEntitlement: "none" | "active";
  account: { ownerId: string; email: string };
  application: { internalNotes: string };
  billing: { customerId: string; subscriptionId: string };
}
// Public data is an explicit allowlist, not Omit<ProfessionalRecord, ...>.
export interface PublicProfessional {
  freeConsultation?: boolean;
  id: string;
  businessName: string;
  categoryIds: string[];
  city: string;
  state: string;
  specialty: string;
  summary: string;
  services: string[];
  verifiedCredentials: string[];
}
export interface PublicProfile extends PublicProfessional {
  serviceArea: string;
  listedCredentials: string[];
  contact: { email: string; phone: string; website: string };
}
