export const consultationFormats = [
  { id: "phone", label: "Phone" },
  { id: "video", label: "Video" },
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
/** Proposed baseline only; no payment or appointment is created by this configuration. */
export const consultationOffer: ConsultationOffer = Object.freeze({
  amountCents: 5000,
  currency: "USD",
  durationMinutes: 15,
});
export function consultationOfferLabel(
  offer: ConsultationOffer = consultationOffer,
): string {
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
  "Assign an approved professional with an active subscription, no suspension and the requested category. Professionals may accept or decline their assignment. Declining returns the request to the unassigned queue. Visitor contact details are excluded from professional views.";
export interface DemoConsultationRequest extends Readonly<ConsultationFields> {
  readonly id: string;
  readonly status: ConsultationStatus;
  readonly paymentStatus: "not-collected";
  readonly offer: ConsultationOffer;
  readonly providerId: string | null;
  readonly scheduledAt: null;
  readonly adminNote: string;
}
