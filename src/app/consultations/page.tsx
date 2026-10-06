import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/ui/notice";
import { consultationOfferLabel } from "@/domain/consultation";
import { ConsultationRequestForm } from "@/features/consultations/request-form";
export const metadata: Metadata = {
  title: "Consultations | Demo request",
  description:
    "Explore a proposed short consultation and try a fictional request. No appointment or payment is made.",
  robots: { index: false, follow: false },
};
export default function ConsultationsPage() {
  return (
    <div className="container consultation-page">
      <header id="consultation-intro" className="consultation-intro">
        <div>
          <p className="section-label">Consultations · Demo preview</p>
          <h1>A little guidance for your next home project.</h1>
          <p>
            Explore a short conversation about healthy-home services. Tell us
            the kind of question you would like to discuss using a fictional
            request.
          </p>
          <a className="button" href="#request">
            Try a demo request
          </a>
        </div>
        <aside
          className="consultation-offer"
          aria-label="Proposed consultation offer"
        >
          <p className="section-label">Current proposed offer</p>
          <p className="consultation-price">{consultationOfferLabel()}</p>
          <p>
            Pending client confirmation. Format, specialist selection and
            delivery arrangements are still being defined.
          </p>
          <p className="field-help">
            This preview provides no clinical service or guaranteed written
            summary.
          </p>
        </aside>
      </header>
      <Notice>
        <strong>Request demo only.</strong> No real appointment reservation,
        specialist assignment, payment or message delivery takes place.
        Submitting does not confirm an appointment or charge money.
      </Notice>
      <section
        className="consultation-process"
        aria-labelledby="consultation-process-heading"
      >
        <h2 id="consultation-process-heading">The intended workflow</h2>
        <p>
          This describes the planned process. Only the fictional request step
          can be tried here.
        </p>
        <ol>
          <li>
            <h3>Request</h3>
            <p>Share a topic, a relevant category and a format preference.</p>
          </li>
          <li>
            <h3>Coordination</h3>
            <p>
              Specialist selection, availability and delivery arrangements would
              need to be agreed.
            </p>
          </li>
          <li>
            <h3>Confirmation</h3>
            <p>
              An appointment would require a separate confirmation once
              arrangements are settled.
            </p>
          </li>
        </ol>
        <Link className="text-link" href="/directory">
          Prefer to explore? Browse the professional directory →
        </Link>
      </section>
      <ConsultationRequestForm />
    </div>
  );
}
