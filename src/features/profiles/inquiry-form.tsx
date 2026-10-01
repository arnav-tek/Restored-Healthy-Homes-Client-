"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import {
  inquiryLimits,
  validateInquiry,
  type InquiryErrors,
  type InquiryField,
} from "@/validation/inquiry";

export function InquiryForm() {
  const ready = useDemoReady();
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [confirmed, setConfirmed] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (confirmed) confirmation.current?.focus();
  }, [confirmed]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    setConfirmed(true);
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
      <h2 id="inquiry-heading">Try a demo inquiry</h2>
      <p id="inquiry-demo-note" className="inquiry-notice">
        Use sample information only. Nothing is sent or saved. Do not include
        medical histories or other sensitive details.
      </p>
      {confirmed ? (
        <div className="inquiry-confirmation">
          <h3 ref={confirmation} tabIndex={-1}>
            Demo inquiry complete
          </h3>
          <p>
            Your sample entries passed validation and were cleared. Nothing was
            sent or saved, and no professional will receive a message.
          </p>
          <Button
            type="button"
            onClick={() => {
              setConfirmed(false);
              setErrors({});
              requestAnimationFrame(() =>
                document.getElementById("inquiry-name")?.focus(),
              );
            }}
          >
            Start another demo inquiry
          </Button>
        </div>
      ) : (
        <form
          ref={form}
          onSubmit={submit}
          noValidate
          autoComplete="off"
          aria-describedby="inquiry-demo-note"
        >
          <noscript>
            <p>
              Enable JavaScript to try this local demo form. No inquiry endpoint
              is available.
            </p>
          </noscript>
          <fieldset disabled={!ready}>
            <legend className="sr-only">Sample inquiry details</legend>
            <p className="field-help">All fields are required.</p>
            {Object.keys(errors).length > 0 ? (
              <p className="field-error" role="alert">
                Check the highlighted fields below.
              </p>
            ) : null}
            <div className="search-field">
              <label htmlFor="inquiry-name">Name (sample)</label>
              <input
                {...fieldProps("name")}
                type="text"
                placeholder="Sample Homeowner"
              />
              {error("name")}
            </div>
            <div className="search-field">
              <label htmlFor="inquiry-email">Email (sample)</label>
              <input
                {...fieldProps("email")}
                type="email"
                placeholder="homeowner@example.invalid"
                spellCheck={false}
              />
              {error("email")}
            </div>
            <div className="search-field">
              <label htmlFor="inquiry-message">Message (sample)</label>
              <textarea
                {...fieldProps("message")}
                rows={5}
                minLength={10}
                placeholder="I would like to learn about your services for a sample project."
              />
              <p className="field-help">
                10–2,000 characters. Describe a fictional project or service
                question.
              </p>
              {error("message")}
            </div>
            <Button type="submit">Preview demo inquiry</Button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
