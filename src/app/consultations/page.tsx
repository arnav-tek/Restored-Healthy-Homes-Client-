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
import { ConnectedConsultationRequest } from "@/features/consultations/connected-request";
import { applicationMode } from "@/domain/config";
import { loadPublicDirectory } from "@/data/supabase/public-directory";

export const metadata: Metadata = {
  title: "Consultations",
  description:
    "Request a free phone consultation with a participating specialist. Timing is agreed separately.",
  robots: { index: false, follow: false },
};

export default async function ConsultationsPage() {
  const connected = applicationMode(process.env) === "staging";
  let catalog: {id:string;name:string}[] = [], unavailable = false;
  if (connected) try { catalog = (await loadPublicDirectory()).catalog; } catch { unavailable = true; }
  return (
    <div className="container consultation-page">
      {/* Hero: 2-column desktop layout */}
      <header id="consultation-intro" className="consultation-intro">
        <div className="consultation-hero-left" data-scroll-reveal>
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
          data-scroll-reveal
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
        <div className="process-header" data-scroll-reveal>
          <h2 id="consultation-process-heading" className="section-eyebrow section-tag">
            HOW CONSULTATIONS WORK
          </h2>
          <p className="process-title">Start with a simple process.</p>
          <p className="process-subtitle">
            {connected ? 'Send a request, then check its saved coordination status. Call timing is agreed separately.' : 'Begin by preparing a request. Appointment scheduling is not connected yet.'}
          </p>
        </div>
        <ol className="process-steps" data-scroll-stagger>
          <li className="process-step" data-scroll-reveal>
            <div className="step-circle-wrapper">
              <div className="step-circle">
                <FileText size={24} className="step-icon" aria-hidden="true" />
              </div>
              <span className="step-badge" aria-hidden="true">1</span>
              <div className="step-connector" aria-hidden="true" />
            </div>
            <div className="step-content">
              <h3>Request</h3>
              <p>{connected ? 'Choose the specialty and describe what you would like to discuss.' : 'Select a relevant category and a consultation format preference.'}</p>
            </div>
          </li>
          <li className="process-step" data-scroll-reveal>
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
                {connected ? 'An administrator assigns a participating specialist in your selected category.' : 'Specialist selection and availability would need to be agreed.'}
              </p>
            </div>
          </li>
          <li className="process-step" data-scroll-reveal>
            <div className="step-circle-wrapper">
              <div className="step-circle">
                <Calendar size={24} className="step-icon" aria-hidden="true" />
              </div>
              <span className="step-badge" aria-hidden="true">3</span>
            </div>
            <div className="step-content">
              <h3>Confirmation</h3>
              <p>
                {connected ? 'The specialist accepts or declines. Acceptance starts coordination; it does not book an appointment.' : 'An appointment would require a separate confirmation once arrangements are settled.'}
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
      {connected ? unavailable ? <p role="alert">Consultation categories are temporarily unavailable. Please try again later.</p> : <ConnectedConsultationRequest categories={catalog}/> : <ConsultationRequestForm />}
    </div>
  );
}
