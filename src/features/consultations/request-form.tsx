"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { categories } from "@/domain/categories";
import {
  consultationFormats,
  consultationOfferLabel,
  consultationStatusLabels,
} from "@/domain/consultation";
import { publicConsultationSummary } from "@/domain/consultation-session";
import { useDemoDraft, useDemoSession } from "@/features/member/demo-session";
import { SessionReset } from "@/features/dashboard/session-reset";
import {
  consultationFieldOrder,
  consultationLimits,
  parseConsultation,
  type ConsultationErrors,
  type ConsultationField,
} from "@/validation/consultation";
import {
  Lock,
  MessageSquare,
  Clock,
  User,
  Mail,
  LayoutGrid,
  Video,
  FileText,
  ArrowRight,
} from "lucide-react";

export function ConsultationRequestForm() {
  const { resetVersion } = useDemoSession();
  return <RequestForm key={resetVersion} />;
}
function RequestForm() {
  const { state, dispatch } = useDemoSession();
  const { draft, saveDraft, clearDraft } = useDemoDraft("consultation");
  const ready = useDemoReady();
  const [errors, setErrors] = useState<ConsultationErrors>({});
  const form = useRef<HTMLFormElement>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const record = state.consultations.find(
    (item) => item.id === state.consultationId,
  );
  const submitted = record ? publicConsultationSummary(record) : undefined;
  useEffect(() => {
    if (record) confirmation.current?.focus();
  }, [record]);
  function focusName() {
    requestAnimationFrame(() =>
      document.getElementById("consultation-name")?.focus(),
    );
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || state.consultationId !== null) return;
    const data = new FormData(event.currentTarget);
    const result = parseConsultation(
      Object.fromEntries(
        consultationFieldOrder.map((field) => [field, data.get(field)]),
      ),
    );
    if (!result.ok) {
      setErrors(result.errors);
      const first = consultationFieldOrder.find(
        (field) => result.errors[field],
      );
      const control = form.current?.elements.namedItem(first ?? "name");
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    dispatch({ type: "request-consultation", fields: result.fields });
    clearDraft();
    setErrors({});
  }
  function fieldProps(field: ConsultationField) {
    return {
      id: `consultation-${field}`,
      name: field,
      required: true,
      value: String(draft?.[field] ?? ""),
      "aria-invalid": !!errors[field],
      "aria-describedby": `consultation-${field}-help consultation-${field}-error`,
      onChange: (
        event: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => saveDraft({ ...draft, [field]: event.target.value }),
    };
  }
  function error(field: ConsultationField) {
    return (
      <p className="field-error" id={`consultation-${field}-error`}>
        {errors[field]}
      </p>
    );
  }
  return (
    <section
      id="request"
      className="consultation-request"
      aria-labelledby="consultation-form-heading"
    >
      {submitted ? (
        <div className="consultation-form-card consultation-confirmation-card">
          <div className="panel consultation-confirmation">
            <p className="section-label section-tag">{submitted.status}</p>
            <h2 id="consultation-form-heading" ref={confirmation} tabIndex={-1}>
              Request prepared
            </h2>
            <p>
              {submitted.status === "requested"
                ? "No appointment is booked, no specialist has been assigned, no payment was taken and no message was sent."
                : "No appointment is booked, no payment was taken and no message was sent. Assignment and acceptance are coordination only."}
            </p>
            <dl className="consultation-summary">
              <div>
                <dt>Request status</dt>
                <dd>{consultationStatusLabels[submitted.status]}</dd>
              </div>
              <div>
                <dt>Appointment</dt>
                <dd>Not booked</dd>
              </div>
              <div>
                <dt>Professional category</dt>
                <dd>
                  {
                    categories.find((item) => item.id === submitted.categoryId)
                      ?.name
                  }
                </dd>
              </div>
              <div>
                <dt>Format preference</dt>
                <dd>
                  {
                    consultationFormats.find(
                      (item) => item.id === submitted.format,
                    )?.label
                  }
                </dd>
              </div>
              <div>
                <dt>Proposed offer</dt>
                <dd>
                  {consultationOfferLabel(submitted.offer)} · Details to be
                  confirmed
                </dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>Not collected</dd>
              </div>
            </dl>
            <p className="field-help">
              This request exists only in this tab’s session. Refresh, full-page
              navigation or reset clears it. Format is a preference, not a booked
              service.
            </p>
            <div className="confirmation-actions">
              <Button
                type="button"
                className="button make-another-request-btn"
                disabled={!ready}
                onClick={() => {
                  dispatch({ type: "new-consultation" });
                  setErrors({});
                  focusName();
                }}
              >
                Make another request
              </Button>
              <Link className="text-link" href="/consultations#consultation-intro">
                Back to consultations
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="consultation-form-card">
          {/* Narrower Left Information Panel */}
          <aside className="consultation-info-panel">
            <div className="info-panel-top">
              <p className="info-panel-eyebrow section-tag">SEND A CONSULTATION REQUEST</p>
              <h2 className="info-panel-title">Tell us what you need help with.</h2>
              <p id="consultation-demo-note" className="info-panel-note">
                Requests stay in this tab and are not sent or saved permanently. No
                appointment is booked or payment collected. Please leave out
                sensitive personal information.
              </p>
            </div>
            <div className="info-panel-points">
              <div className="info-point">
                <div className="info-point-icon" aria-hidden="true">
                  <Lock size={16} />
                </div>
                <div>
                  <p className="info-point-title">Private & secure</p>
                  <p className="info-point-desc">Your information is not shared publicly.</p>
                </div>
              </div>
              <div className="info-point">
                <div className="info-point-icon" aria-hidden="true">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <p className="info-point-title">No payment required</p>
                  <p className="info-point-desc">This is just a request to start a conversation.</p>
                </div>
              </div>
              <div className="info-point">
                <div className="info-point-icon" aria-hidden="true">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="info-point-title">Expert guidance</p>
                  <p className="info-point-desc">Get matched with the right professional.</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Form Panel */}
          <div className="consultation-form-wrapper">
            <form
              ref={form}
              noValidate
              autoComplete="off"
              onSubmit={submit}
              className="consultation-form"
              aria-describedby="consultation-demo-note"
            >
              <h2 id="consultation-form-heading" className="sr-only">
                Prepare a consultation request
              </h2>
              <noscript>
                <p className="field-error">
                  Enable JavaScript to try this session-only form. Submission is
                  disabled; no submission endpoint exists.
                </p>
              </noscript>
              {draft && (
                <p className="draft-note">
                  Your unfinished draft stays in this tab during client-side
                  navigation. Refresh or confirmed reset clears it.
                </p>
              )}
              {Object.keys(errors).length > 0 && (
                <p role="alert" className="field-error">
                  Check the highlighted fields. No request has been recorded.
                </p>
              )}
              <fieldset disabled={!ready} className="member-form-fields">
                <legend className="sr-only">Consultation request details</legend>
                <div className="consultation-field-pair">
                  <div className="search-field">
                    <label htmlFor="consultation-name">Name</label>
                    <div className="input-with-icon">
                      <User size={16} className="input-icon" aria-hidden="true" />
                      <input
                        {...fieldProps("name")}
                        maxLength={consultationLimits.name}
                        placeholder="Your name"
                      />
                    </div>
                    <p id="consultation-name-help" className="field-help">
                      2–100 characters.
                    </p>
                    {error("name")}
                  </div>
                  <div className="search-field">
                    <label htmlFor="consultation-email">Email</label>
                    <div className="input-with-icon">
                      <Mail size={16} className="input-icon" aria-hidden="true" />
                      <input
                        {...fieldProps("email")}
                        type="email"
                        maxLength={consultationLimits.email}
                        placeholder="homeowner@example.invalid"
                        spellCheck={false}
                      />
                    </div>
                    <p id="consultation-email-help" className="field-help">
                      A email address; up to 254 characters.
                    </p>
                    {error("email")}
                  </div>
                </div>
                <div className="search-field">
                  <label htmlFor="consultation-categoryId">
                    Professional category
                  </label>
                  <div className="input-with-icon select-with-icon">
                    <LayoutGrid size={16} className="input-icon" aria-hidden="true" />
                    <select {...fieldProps("categoryId")}>
                      <option value="">Choose one category</option>
                      {categories.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p id="consultation-categoryId-help" className="field-help">
                    Choose the specialty relevant to your question. No specialist is
                    assigned.
                  </p>
                  {error("categoryId")}
                </div>
                <div className="search-field">
                  <label htmlFor="consultation-format">Preferred format</label>
                  <div className="input-with-icon select-with-icon">
                    <Video size={16} className="input-icon" aria-hidden="true" />
                    <select {...fieldProps("format")}>
                      <option value="">Choose a preference</option>
                      {consultationFormats.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p id="consultation-format-help" className="field-help">
                    Phone, video or no preference. Delivery arrangements remain to
                    be confirmed.
                  </p>
                  {error("format")}
                </div>
                <div className="search-field">
                  <label htmlFor="consultation-topic">Question or topic</label>
                  <div className="textarea-wrapper">
                    <FileText size={16} className="textarea-icon" aria-hidden="true" />
                    <textarea
                      {...fieldProps("topic")}
                      rows={5}
                      maxLength={consultationLimits.topic}
                      placeholder="Describe a home project or service question in plain text..."
                    />
                  </div>
                  <div className="field-help-counter-row">
                    <p id="consultation-topic-help" className="field-help">
                      20–2,000 characters.
                    </p>
                    <span className="character-count" aria-hidden="true">
                      {String(draft?.topic ?? "").length}/2000
                    </span>
                  </div>
                  {error("topic")}
                </div>
                <Button type="submit" className="button submit-request-button">
                  <span>Record request</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </fieldset>
            </form>
          </div>
        </div>
      )}
      <div className="qa-form-footer">
        <Link className="explore-qa-link" href="/questions">
          <MessageSquare size={16} aria-hidden="true" />
          <span>Explore public Q&A</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
        <SessionReset onReset={focusName} />
      </div>
      <p className="reset-help-note">
        Reset clears this request, all drafts and the shared application,
        member, admin and Q&A changes.
      </p>
    </section>
  );
}
