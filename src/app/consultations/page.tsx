import type { Metadata } from "next";
import Link from "next/link";
import {
  MessageSquare,
  CheckCircle2,
  FileText,
  Users,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { consultationOfferLabel } from "@/domain/consultation";
import { ConsultationRequestForm } from "@/features/consultations/request-form";

export const metadata: Metadata = {
  title: "Consultations",
  description:
    "Request a free phone consultation with a participating specialist. This demo does not book an appointment.",
  robots: { index: false, follow: false },
};

export default function ConsultationsPage() {
  return (
    <div className="container consultation-page">
      {/* Hero: 2-column desktop layout */}
      <header id="consultation-intro" className="consultation-intro">
        <div className="consultation-hero-left">
          <p className="section-eyebrow section-tag">
            CONSULTATIONS
          </p>
          <h1 className="consultation-hero-title">
            A little guidance for your next home project.
          </h1>
          <p className="consultation-hero-subtitle">
            Explore a short conversation about healthy-home services. Prepare
            the question you would like to discuss.
          </p>
          <a className="button consultation-hero-cta" href="#request">
            Request a free consult <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
        <aside
          className="consultation-offer-card"
          aria-label="Proposed consultation offer"
        >
          <div className="offer-card-top">
            <div className="offer-card-icon" aria-hidden="true">
              <MessageSquare size={22} />
            </div>
            <div>
              <p className="offer-card-eyebrow section-tag">FREE PHONE CONSULTATIONS</p>
              <p className="consultation-price">{consultationOfferLabel()}</p>
            </div>
          </div>
          <ul className="offer-notes-list">
            <li>
              <CheckCircle2 size={18} className="offer-check-icon" aria-hidden="true" />
              <span>Available only with participating specialists. Timing and duration are agreed directly.</span>
            </li>
            <li>
              <CheckCircle2 size={18} className="offer-check-icon" aria-hidden="true" />
              <span>Clinical services and written summaries are not included.</span>
            </li>
            <li>
              <CheckCircle2 size={18} className="offer-check-icon" aria-hidden="true" />
              <span>You&apos;ll coordinate directly with the selected professional.</span>
            </li>
          </ul>
        </aside>
      </header>

      {/* How consultations work: 3 visual process steps */}
      <section
        className="consultation-process"
        aria-labelledby="consultation-process-heading"
      >
        <div className="process-header">
          <h2 id="consultation-process-heading" className="section-eyebrow section-tag">
            HOW CONSULTATIONS WORK
          </h2>
          <p className="process-title">Start with a simple process.</p>
          <p className="process-subtitle">
            Begin by preparing a request. Appointment scheduling is not connected
            yet.
          </p>
        </div>
        <ol className="process-steps">
          <li className="process-step">
            <div className="step-circle-wrapper">
              <div className="step-circle">
                <FileText size={24} className="step-icon" aria-hidden="true" />
              </div>
              <span className="step-badge" aria-hidden="true">1</span>
              <div className="step-connector" aria-hidden="true" />
            </div>
            <div className="step-content">
              <h3>Request</h3>
              <p>Select a relevant category and a consultation format preference.</p>
            </div>
          </li>
          <li className="process-step">
            <div className="step-circle-wrapper">
              <div className="step-circle">
                <Users size={24} className="step-icon" aria-hidden="true" />
              </div>
              <span className="step-badge" aria-hidden="true">2</span>
              <div className="step-connector" aria-hidden="true" />
            </div>
            <div className="step-content">
              <h3>Coordination</h3>
              <p>
                Specialist selection and availability
                would need to be agreed.
              </p>
            </div>
          </li>
          <li className="process-step">
            <div className="step-circle-wrapper">
              <div className="step-circle">
                <Calendar size={24} className="step-icon" aria-hidden="true" />
              </div>
              <span className="step-badge" aria-hidden="true">3</span>
            </div>
            <div className="step-content">
              <h3>Confirmation</h3>
              <p>
                An appointment would require a separate confirmation once
                arrangements are settled.
              </p>
            </div>
          </li>
        </ol>
        <div className="process-footer">
          <Link className="browse-professionals-link" href="/directory">
            Browse specialists <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Form card and session actions */}
      <ConsultationRequestForm />
    </div>
  );
}
