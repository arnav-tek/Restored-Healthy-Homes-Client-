"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDemoSession } from "@/features/member/demo-session";
import { inquiryRecipient } from "@/domain/inquiry-session";
import {
  inquiryLimits,
  validateInquiry,
  type InquiryErrors,
  type InquiryField,
} from "@/validation/inquiry";

export function InquiryForm({ professionalId }: { professionalId: string }) {
  const { resetVersion } = useDemoSession();
  return <LocalInquiryForm key={`${professionalId}-${resetVersion}`} professionalId={professionalId} />;
}

function LocalInquiryForm({ professionalId }: { professionalId: string }) {
  const { state, dispatch, setDraft } = useDemoSession();
  const ready = useDemoReady();
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [checked, setChecked] = useState(false);
  const recipient = inquiryRecipient(state, professionalId);
  const saved = !!state.currentInquiryByProfessional[professionalId];
  const confirmed = saved || checked;
  const form = useRef<HTMLFormElement>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (confirmed) confirmation.current?.focus();
  }, [confirmed]);
  // Track only dirtiness for sign-out confirmation, never the inquiry contents.
  useEffect(() => () => setDraft("inquiry-dirty", null), [setDraft]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || confirmed) return;
    const data = new FormData(event.currentTarget);
    const nextErrors = validateInquiry({
      name: data.get("name"),
      email: data.get("email"),
      message: data.get("message"),
    });
    setErrors(nextErrors);
    const first = (["name", "email", "message"] as const).find(
      (field) => nextErrors[field],
    );
    if (first) {
      const control = form.current?.elements.namedItem(first);
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    event.currentTarget.reset();
    setDraft("inquiry-dirty", null);
    if (recipient) dispatch({ type: "submit-inquiry", professionalId, fields: {
      name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""), message: String(data.get("message") ?? ""),
    } });
    else setChecked(true);
  }
  function fieldProps(field: InquiryField) {
    return {
      id: `inquiry-${field}`,
      name: field,
      required: true,
      maxLength: inquiryLimits[field],
      "aria-invalid": !!errors[field],
      "aria-describedby": errors[field] ? `inquiry-${field}-error` : undefined,
    };
  }
  function error(field: InquiryField) {
    return errors[field] ? (
      <p className="field-error" id={`inquiry-${field}-error`}>
        {errors[field]}
      </p>
    ) : null;
  }
  return (
    <section className="inquiry-panel" aria-labelledby="inquiry-heading">
      <h2 id="inquiry-heading">Prepare an inquiry</h2>
      <p id="inquiry-demo-note" className="inquiry-notice">
        Use fictional information only. {recipient
          ? "Your inquiry is saved to the intended member’s inbox in this demo tab. No email is sent."
          : "This example has no linked demo member inbox. You can check the form, but nothing will be saved or sent."}
      </p>
      {confirmed ? (
        <div className="inquiry-confirmation">
          <h3 ref={confirmation} tabIndex={-1}>
            {saved ? "Inquiry saved to demo inbox" : "Inquiry checked"}
          </h3>
          <p>
            {saved ? "Saved to this demo session for the intended member. Your form was cleared; no email was sent. Refresh or reset clears the inquiry."
              : "Your entries passed validation and were cleared. Nothing was sent or saved because this example has no linked demo member inbox."}
          </p>
          <Button
            type="button"
            onClick={() => {
              dispatch({ type: "new-inquiry", professionalId });
              setChecked(false);
              setErrors({});
              requestAnimationFrame(() =>
                document.getElementById("inquiry-name")?.focus(),
              );
            }}
          >
            Start another inquiry
          </Button>
        </div>
      ) : (
        <form
          ref={form}
          onSubmit={submit}
          onChange={(event) => {
            const data = new FormData(event.currentTarget);
            const dirty = ["name", "email", "message"].some((field) =>
              Boolean(data.get(field)),
            );
            setDraft("inquiry-dirty", dirty ? {} : null);
          }}
          noValidate
          autoComplete="off"
          aria-describedby="inquiry-demo-note"
        >
          <noscript>
            <p>
              Enable JavaScript to try this local form. No inquiry endpoint is
              available.
            </p>
          </noscript>
          <fieldset disabled={!ready}>
            <legend className="sr-only">Inquiry details</legend>
            <p className="field-help">All fields are required.</p>
            {Object.keys(errors).length > 0 ? (
              <p className="field-error" role="alert">
                Check the highlighted fields below.
              </p>
            ) : null}
            <div className="search-field">
              <label htmlFor="inquiry-name">Name</label>
              <input
                {...fieldProps("name")}
                type="text"
                placeholder="Your name"
              />
              {error("name")}
            </div>
            <div className="search-field">
              <label htmlFor="inquiry-email">Email</label>
              <input
                {...fieldProps("email")}
                type="email"
                placeholder="homeowner@example.invalid"
                spellCheck={false}
              />
              {error("email")}
            </div>
            <div className="search-field">
              <label htmlFor="inquiry-message">Message</label>
              <textarea
                {...fieldProps("message")}
                rows={5}
                minLength={10}
                placeholder="I would like to learn about your services for a project."
              />
              <p className="field-help">
                10–2,000 characters. Describe a project or service question.
              </p>
              {error("message")}
            </div>
            <Button type="submit">Check inquiry</Button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
