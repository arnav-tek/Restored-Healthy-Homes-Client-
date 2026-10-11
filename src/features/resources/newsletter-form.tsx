"use client";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";

export function NewsletterForm() {
  const ready = useDemoReady();
  const input = useRef<HTMLInputElement>(null);
  const confirmation = useRef<HTMLParagraphElement>(null);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = input.current?.value.trim() ?? "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      input.current?.focus();
      return;
    }
    setError("");
    setComplete(true);
    if (input.current) input.current.value = "";
    requestAnimationFrame(() => confirmation.current?.focus());
  }
  return (
    <section
      className="resource-newsletter panel"
      aria-labelledby="newsletter-heading"
    >
      <div>
        <h2 id="newsletter-heading">Keep in touch</h2>
        <p>
          Try the newsletter signup preview. Email updates will be available
          when a provider is connected.
        </p>
      </div>
      <form onSubmit={submit} noValidate>
        <label htmlFor="newsletter-email">Email address</label>
        <p id="newsletter-limit" className="field-help">
          Preview only. Your address is not subscribed, sent or saved.
        </p>
        <input
          ref={input}
          id="newsletter-email"
          type="email"
          maxLength={254}
          autoComplete="email"
          required
          disabled={!ready}
          aria-invalid={!!error}
          aria-describedby={`newsletter-limit${error ? " newsletter-error" : ""}`}
          onChange={() => {
            setError("");
            setComplete(false);
          }}
        />
        {error && (
          <p id="newsletter-error" className="field-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!ready}>
          Preview signup
        </Button>
        <p ref={confirmation} role="status" tabIndex={-1}>
          {complete
            ? "Signup preview complete. You have not been subscribed; your address was cleared."
            : ""}
        </p>
        <noscript>
          <p>JavaScript is required to try this preview. Signup is disabled.</p>
        </noscript>
      </form>
    </section>
  );
}
