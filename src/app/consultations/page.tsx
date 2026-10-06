import type { Metadata } from "next";
import Link from "next/link";
import { consultationOfferLabel } from "@/domain/consultation";
import { ConsultationRequestForm } from "@/features/consultations/request-form";
export const metadata: Metadata = {
  title: "Consultations",
  description:
    "Explore a proposed short consultation and try a request. No appointment or payment is made.",
  robots: { index: false, follow: false },
};
export default function ConsultationsPage() {
  return (
    <div className="container consultation-page">
      <header id="consultation-intro" className="consultation-intro">
        <div>
          <p className="section-label">Consultations</p>
          <h1>A little guidance for your next home project.</h1>
          <p>
            Explore a short conversation about healthy-home services. Prepare
            the question you would like to discuss.
          </p>
          <a className="button" href="#request">
            Prepare a request
          </a>
        </div>
        <aside
          className="consultation-offer"
          aria-label="Proposed consultation offer"
        >
          <p className="section-label">Current proposed offer</p>
          <p className="consultation-price">{consultationOfferLabel()}</p>
          <p>
            Format, availability and delivery arrangements will need to be
            confirmed.
          </p>
          <p className="field-help">
            Clinical services and written summaries are not included.
          </p>
        </aside>
      </header>
      <section
        className="consultation-process"
        aria-labelledby="consultation-process-heading"
      >
        <h2 id="consultation-process-heading">How consultations work</h2>
        <p>
          Start by preparing a request. Scheduling and payment are not available
          yet.
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
