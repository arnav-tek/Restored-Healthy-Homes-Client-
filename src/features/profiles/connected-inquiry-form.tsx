"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { validateInquiry, type InquiryErrors } from "@/validation/inquiry";
import { isRecord } from "@/validation/member-account";
import { InquiryFields } from "./inquiry-fields";

export function ConnectedInquiryForm({
  professionalId,
}: {
  professionalId: string;
}) {
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);
  const request = useRef<{ content: string; id: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (saved) confirmation.current?.focus();
  }, [saved]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    const fields = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
    };
    const nextErrors = validateInquiry(fields);
    setErrors(nextErrors);
    setFailure("");
    const first = (["name", "email", "message"] as const).find(
      (field) => nextErrors[field],
    );
    if (first) {
      const control = form.current?.elements.namedItem(first);
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    const content = JSON.stringify({ professionalId, ...fields });
    if (request.current?.content !== content)
      request.current = { content, id: crypto.randomUUID() };
    inFlight.current = true;
    setPending(true);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          professionalId,
          ...fields,
          requestId: request.current.id,
        }),
        cache: "no-store",
      });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result) || result.saved !== true) {
        setFailure(
          isRecord(result) && typeof result.error === "string"
            ? result.error
            : "Your inquiry could not be saved. Please try again. Your draft has been kept.",
        );
        if (isRecord(result) && isRecord(result.errors)) {
          const messages: InquiryErrors = {};
          for (const key of ["name", "email", "message"] as const)
            if (typeof result.errors[key] === "string")
              messages[key] = result.errors[key];
          setErrors(messages);
        }
        return;
      }
      form.current?.reset();
      setSaved(true);
    } catch {
      setFailure(
        "Your inquiry could not be confirmed. Your draft has been kept. Try again to check the same request safely.",
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <section className="inquiry-panel" aria-labelledby="inquiry-heading">
      <h2 id="inquiry-heading">Contact this professional</h2>
      <p id="inquiry-note" className="inquiry-notice">
        Your message and contact details will be saved to this professional’s
        member inbox. Email notification is not guaranteed. Do not include
        sensitive health or financial information.
      </p>
      {saved ? (
        <div className="inquiry-confirmation">
          <h3 ref={confirmation} tabIndex={-1}>
            Your inquiry has been saved
          </h3>
          <p>Your message is available in the professional’s member inbox.</p>
          <Button
            type="button"
            onClick={() => {
              request.current = null;
              setSaved(false);
              setErrors({});
              setFailure("");
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
          noValidate
          aria-describedby="inquiry-note"
          aria-busy={pending}
        >
          <noscript>
            <p>Enable JavaScript to save an inquiry.</p>
          </noscript>
          {failure && (
            <p className="field-error" role="alert">
              {failure}
            </p>
          )}
          <fieldset disabled={pending}>
            <legend className="sr-only">Inquiry details</legend>
            <InquiryFields errors={errors} />
            <Button type="submit">
              {pending ? "Saving inquiry…" : "Save inquiry"}
            </Button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
