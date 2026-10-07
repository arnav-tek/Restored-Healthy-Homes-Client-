"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";

export function FooterNewsletter() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <form className="footer-newsletter-form" onSubmit={handleSubmit}>
      <label htmlFor="footer-newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="footer-newsletter-input-wrap">
        <input
          id="footer-newsletter-email"
          type="email"
          name="email"
          placeholder="Enter your email"
          autoComplete="email"
          required
          disabled={submitted}
          className="footer-newsletter-input"
        />
        <button
          type="submit"
          className="footer-newsletter-btn"
          aria-label={submitted ? "Subscribed" : "Subscribe to newsletter"}
          disabled={submitted}
        >
          {submitted ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <ArrowRight size={16} aria-hidden="true" />
          )}
        </button>
      </div>
      {submitted ? (
        <p className="footer-newsletter-status" role="status">
          Thank you for subscribing!
        </p>
      ) : null}
    </form>
  );
}
