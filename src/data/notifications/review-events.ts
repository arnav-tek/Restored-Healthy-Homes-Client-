import "server-only";
/** Dedicated saved-review event contract; no sender/worker is enabled.
 * Future delivery must revalidate current publication/eligibility, original owner,
 * unchanged verified email and the exact decision version. Never silently reroute.
 */
export interface ReviewNotificationEvent {
  reviewId: string;
  version: number;
  eventType: "review.submitted" | "review.published" | "review.rejected";
  recipientId: string | null;
  professionalId: string;
  recipientEmail: string | null;
  recipientKey: string;
  createdAt: string;
  state: "pending_configuration" | "canceled";
}
