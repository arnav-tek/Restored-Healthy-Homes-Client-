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
        <div className="panel consultation-confirmation">
          <p className="section-label">{submitted.status} · This session</p>
          <h2 id="consultation-form-heading" ref={confirmation} tabIndex={-1}>
            Request recorded in this tab
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
          <Button
            type="button"
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
      ) : (
        <form
          ref={form}
          noValidate
          autoComplete="off"
          onSubmit={submit}
          className="panel consultation-form"
          aria-describedby="consultation-demo-note"
        >
          <h2 id="consultation-form-heading">Prepare a consultation request</h2>
          <p id="consultation-demo-note">
            Requests stay in this tab and are not sent or saved permanently. No
            appointment is booked or payment collected. Please leave out
            sensitive personal information.
          </p>
          <noscript>
            <p>
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
                <input
                  {...fieldProps("name")}
                  maxLength={consultationLimits.name}
                  placeholder="Your name"
                />
                <p id="consultation-name-help" className="field-help">
                  2–100 characters.
                </p>
                {error("name")}
              </div>
              <div className="search-field">
                <label htmlFor="consultation-email">Email</label>
                <input
                  {...fieldProps("email")}
                  type="email"
                  maxLength={consultationLimits.email}
                  placeholder="homeowner@example.invalid"
                  spellCheck={false}
                />
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
              <select {...fieldProps("categoryId")}>
                <option value="">Choose one category</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p id="consultation-categoryId-help" className="field-help">
                Choose the specialty relevant to your question. No specialist is
                assigned.
              </p>
              {error("categoryId")}
            </div>
            <div className="search-field">
              <label htmlFor="consultation-format">Preferred format</label>
              <select {...fieldProps("format")}>
                <option value="">Choose a preference</option>
                {consultationFormats.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p id="consultation-format-help" className="field-help">
                Phone, video or no preference. Delivery arrangements remain to
                be confirmed.
              </p>
              {error("format")}
            </div>
            <div className="search-field">
              <label htmlFor="consultation-topic">Question or topic</label>
              <textarea
                {...fieldProps("topic")}
                rows={6}
                maxLength={consultationLimits.topic}
              />
              <p id="consultation-topic-help" className="field-help">
                20–2,000 characters. Describe a home project or service question
                in plain text.
              </p>
              {error("topic")}
            </div>
            <Button type="submit">Record request</Button>
          </fieldset>
        </form>
      )}
      <div className="qa-form-footer">
        <Link className="text-link" href="/questions">
          Explore public Q&A
        </Link>
        <SessionReset onReset={focusName} />
      </div>
      <p className="field-help">
        Reset clears this request, all drafts and the shared application,
        member, admin and Q&A changes.
      </p>
    </section>
  );
}
