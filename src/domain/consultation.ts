export const consultationFormats = [
  { id: "phone", label: "Phone" },
  { id: "no-preference", label: "No preference" },
] as const;
export type ConsultationFormat = (typeof consultationFormats)[number]["id"];
export interface ConsultationFields {
  name: string;
  email: string;
  categoryId: string;
  format: ConsultationFormat;
  topic: string;
}
export interface ConsultationOffer {
  readonly amountCents: number;
  readonly currency: "USD";
  readonly durationMinutes: number;
}
/** Free phone consultation preview; duration remains provisional. No appointment is booked. */
export const consultationOffer: ConsultationOffer = Object.freeze({
  amountCents: 0,
  currency: "USD",
  durationMinutes: 15,
});
export function consultationOfferLabel(
  offer: ConsultationOffer = consultationOffer,
): string {
  if (offer.amountCents === 0) return "Free phone consultation";
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: offer.currency,
    maximumFractionDigits: 0,
  }).format(offer.amountCents / 100);
  return `${price} ${offer.currency} / ${offer.durationMinutes} minutes`;
}
export const consultationStatuses = [
  "requested",
  "assigned",
  "accepted",
  "cancelled",
] as const;
export type ConsultationStatus = (typeof consultationStatuses)[number];
export const consultationStatusLabels: Record<ConsultationStatus, string> = {
  requested: "Requested",
  assigned: "Assigned · awaiting response",
  accepted: "Accepted for coordination",
  cancelled: "Cancelled",
};
export const consultationPolicy =
  "Assign an approved professional with an active subscription, no suspension, participation in free phone consultations and the requested category. Professionals may accept or decline their assignment. Declining returns the request to the unassigned queue. Visitor contact details are excluded from professional views.";
export interface DemoConsultationRequest extends Readonly<ConsultationFields> {
  readonly id: string;
  readonly status: ConsultationStatus;
  readonly paymentStatus: "not-collected";
  readonly offer: ConsultationOffer;
  readonly providerId: string | null;
  readonly scheduledAt: null;
  readonly adminNote: string;
}
