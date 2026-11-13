import type { ReviewFields, PublicReview } from "./review";
import type { QaStatus, QaAction } from "./qa-admin";
export interface ReviewSubmission extends ReviewFields {
  requestId: string;
}
export interface ReviewDecisionInput {
  id: string;
  version: number;
  action: QaAction;
  reason: string;
  note: string;
}
export interface ReviewFilters {
  status: QaStatus | "all";
  professional: string | null;
  id: string | null;
  page: number;
}
export interface SavedReview extends ReviewFields {
  id: string;
  professionalId: string;
  status: QaStatus;
  version: number;
  note: string;
  eligible: boolean;
}
export interface ReviewHistory extends ReviewFields {
  version: number;
  action: QaAction;
  previousStatus: QaStatus;
  nextStatus: QaStatus;
  actorId: string;
  reason: string;
  note: string;
  at: string;
}
export interface AdminReviewsWorkspace {
  page: number;
  hasNext: boolean;
  total: number;
  items: SavedReview[];
  detail: (SavedReview & { history: ReviewHistory[] }) | null;
  professionals: { id: string; businessName: string }[];
}
export interface MemberReviewsWorkspace {
  professionalId: string | null;
  reviews: PublicReview[];
}
