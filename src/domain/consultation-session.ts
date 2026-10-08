import type { DemoMemberRecord, DemoSession } from "./demo-member";
import type {
  DemoConsultationRequest,
  ConsultationStatus,
  ConsultationFormat,
  ConsultationOffer,
} from "./consultation";
import { isPubliclyEligible } from "./listing";
import { parseCoordinationNote } from "../validation/consultation";

export type ConsultationAction =
  | {
      type: "assign-consultation";
      id: string;
      providerId: string;
      confirmed?: boolean;
    }
  | { type: "unassign-consultation"; id: string; confirmed?: boolean }
  | { type: "accept-consultation" | "decline-consultation"; id: string }
  | { type: "cancel-consultation"; id: string; confirmed: boolean }
  | { type: "note-consultation"; id: string; note: string };

export function canCoordinate(
  member: DemoMemberRecord | undefined,
  categoryId: string,
): boolean {
  return (
    !!member &&
    isPubliclyEligible(member) &&
    member.profile.categoryIds.includes(categoryId)
  );
}
export function consultationNeedsAttention(
  state: DemoSession,
  request: DemoConsultationRequest,
): boolean {
  return (
    request.status !== "cancelled" &&
    request.providerId !== null &&
    !canCoordinate(
      state.records.find((member) => member.id === request.providerId),
      request.categoryId,
    )
  );
}
export interface PublicConsultationSummary {
  readonly id: string;
  readonly categoryId: string;
  readonly format: ConsultationFormat;
  readonly offer: ConsultationOffer;
  readonly status: ConsultationStatus;
  readonly paymentStatus: "not-collected";
}
export interface MemberConsultation extends PublicConsultationSummary {
  readonly topic: string;
  readonly needsAttention: boolean;
}
// Explicit allowlists: no visitor identity, assignment identity or internal notes.
export function publicConsultationSummary(
  request: DemoConsultationRequest,
): PublicConsultationSummary {
  return {
    id: request.id,
    categoryId: request.categoryId,
    format: request.format,
    offer: {
      amountCents: request.offer.amountCents,
      currency: request.offer.currency,
      durationMinutes: request.offer.durationMinutes,
    },
    status: request.status,
    paymentStatus: request.paymentStatus,
  };
}
export function ownConsultations(state: DemoSession): MemberConsultation[] {
  return state.consultations
    .filter((request) => request.providerId === state.selectedId)
    .map((request) => ({
      ...publicConsultationSummary(request),
      topic: request.topic,
      needsAttention: consultationNeedsAttention(state, request),
    }));
}
export function reduceConsultationAction(
  state: DemoSession,
  action: ConsultationAction,
): DemoSession {
  const request = state.consultations.find((item) => item.id === action.id);
  if (!request) return state;
  let updated = request;
  let notice = "";
  switch (action.type) {
    case "assign-consultation": {
      if (
        request.status === "cancelled" ||
        request.providerId === action.providerId ||
        (request.status === "accepted" && action.confirmed !== true) ||
        !canCoordinate(
          state.records.find((item) => item.id === action.providerId),
          request.categoryId,
        )
      )
        return state;
      updated = {
        ...request,
        status: "assigned",
        providerId: action.providerId,
      };
      notice =
        "Assignment updated. Awaiting the selected member’s response. No appointment has been booked.";
      break;
    }
    case "unassign-consultation":
      if (
        !["assigned", "accepted"].includes(request.status) ||
        (request.status === "accepted" && action.confirmed !== true)
      )
        return state;
      updated = { ...request, status: "requested", providerId: null };
      notice =
        "Assignment removed. Request returned to the unassigned queue.";
      break;
    case "accept-consultation":
    case "decline-consultation": {
      // The actor comes from shared selected-member state, never a form field.
      if (
        request.status !== "assigned" ||
        request.providerId !== state.selectedId
      )
        return state;
      if (action.type === "accept-consultation") {
        if (
          !canCoordinate(
            state.records.find((member) => member.id === state.selectedId),
            request.categoryId,
          )
        )
          return state;
        updated = { ...request, status: "accepted" };
        notice =
          "Accepted for coordination. An appointment still needs to be arranged.";
      } else {
        updated = { ...request, status: "requested", providerId: null };
        notice =
          "Assignment declined. Returned to the admin’s unassigned queue.";
      }
      break;
    }
    case "cancel-consultation":
      if (request.status === "cancelled" || action.confirmed !== true)
        return state;
      // Retain assignment for closed-record visibility; never expose it publicly.
      updated = { ...request, status: "cancelled" };
      notice =
        "Request cancelled. This request is now closed.";
      break;
    case "note-consultation": {
      const note = parseCoordinationNote(action.note);
      if (note === null || note === request.adminNote) return state;
      updated = { ...request, adminNote: note };
      notice = "Internal coordination note updated.";
      break;
    }
  }
  return {
    ...state,
    consultations: state.consultations.map((item) =>
      item.id === request.id ? updated : item,
    ),
    revision: state.revision + 1,
    notice,
  };
}
