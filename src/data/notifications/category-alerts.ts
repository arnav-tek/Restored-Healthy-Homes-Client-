import "server-only";
/** Separate Q&A outbox contract. No dispatcher/provider is enabled. Routing must
 * revalidate original recipient, ownership and verified email before future use. */
export interface CategoryAlertEvent {
  eventType: "qa.question_published";
  questionId: string;
  recipientId: string;
  professionalId: string;
  recipientEmail: string;
  createdAt: string;
  state: "pending_configuration" | "canceled";
}

/** Decision-bound operational events. No application-email provider/worker is enabled.
 * Unroutable anonymous-question rejections are canceled, never emailed to an invented contact.
 * Future dispatch must revalidate the original author/listing, verified email and current decision.
 */
export interface QaModerationEvent {
  eventType:
    "qa.question_rejected" | "qa.answer_published" | "qa.answer_rejected";
  decisionId: string;
  questionId: string;
  answerId: string | null;
  recipientId: string | null;
  professionalId: string | null;
  recipientEmail: string | null;
  recipientKey: string;
  createdAt: string;
  state: "pending_configuration" | "canceled";
}
