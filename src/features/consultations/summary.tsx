import {
  consultationFormats,
  consultationOfferLabel,
  consultationStatusLabels,
} from "@/domain/consultation";
import type { PublicConsultationSummary } from "@/domain/consultation-session";
export function ConsultationSummary({
  request,
  category,
}: {
  request: PublicConsultationSummary;
  category: string;
}) {
  return (
    <dl className="consultation-summary">
      <div>
        <dt>Request ID</dt>
        <dd>{request.id}</dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd>{category}</dd>
      </div>
      <div>
        <dt>Format preference</dt>
        <dd>
          {
            consultationFormats.find((format) => format.id === request.format)
              ?.label
          }
        </dd>
      </div>
      <div>
        <dt>Request status</dt>
        <dd>{consultationStatusLabels[request.status]}</dd>
      </div>
      <div>
        <dt>Proposed offer</dt>
        <dd>
          {consultationOfferLabel(request.offer)} · Pending client confirmation
        </dd>
      </div>
      <div>
        <dt>Payment</dt>
        <dd>Not collected</dd>
      </div>
      <div>
        <dt>Appointment</dt>
        <dd>Not booked</dd>
      </div>
    </dl>
  );
}
